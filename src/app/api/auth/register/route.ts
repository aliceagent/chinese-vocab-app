import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { 
  createApiResponse, 
  createValidationError, 
  validateJsonBody, 
  validateRequiredFields, 
  withErrorHandling,
  handleDatabaseError
} from "@/lib/apiUtils"
import { API_CONFIG, ERROR_CODES } from "@/lib/apiConfig"

async function handleRegister(request: NextRequest) {
  // Parse and validate request body
  const body = await validateJsonBody(request)
  const { username, email, password } = body
  
  // Validate required fields
  validateRequiredFields(body, ['username', 'email', 'password'])

  // Validate password length
  if (password.length < API_CONFIG.SECURITY.PASSWORD_MIN_LENGTH) {
    return createValidationError(
      `Password must be at least ${API_CONFIG.SECURITY.PASSWORD_MIN_LENGTH} characters long`
    )
  }

  // Validate email format (basic)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return createValidationError('Invalid email format')
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    })

    if (existingUser) {
      return createValidationError(
        'User with this email or username already exists',
        { 
          conflictType: existingUser.email === email ? 'email' : 'username' 
        }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
      },
    })

    // Return success response (exclude sensitive data)
    return createApiResponse(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      },
      "User created successfully",
      201
    )
  } catch (error) {
    return handleDatabaseError(error)
  }
}

export const POST = withErrorHandling(handleRegister)