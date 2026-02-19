// Global type definitions for Node.js extensions

declare global {
  namespace NodeJS {
    interface Global {
      uploadProgress?: Map<string, any>
    }
  }
  
  var uploadProgress: Map<string, any> | undefined
}

export {}