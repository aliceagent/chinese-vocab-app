'use client'

import { useState } from 'react'
import Link from 'next/link'
import Layout from '@/components/common/Layout'
import FileUpload from '@/components/upload/FileUpload'
import { FileUpload as FileUploadType } from '@/types'

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file')
  const [uploads, setUploads] = useState<FileUploadType[]>([])

  // Paste tab state
  const [pasteText, setPasteText] = useState('')
  const [listName, setListName] = useState('')
  const [pasteLoading, setPasteLoading] = useState(false)
  const [pasteError, setPasteError] = useState('')
  const [pasteSuccess, setPasteSuccess] = useState<{ listId: string; count: number; name: string } | null>(null)

  const handleUploadComplete = (upload: FileUploadType) => {
    setUploads(prev => [...prev, upload])
  }

  const handleUploadUpdate = (uploadId: string, updates: Partial<FileUploadType>) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === uploadId ? { ...upload, ...updates } : upload
      )
    )
  }

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return
    setPasteLoading(true)
    setPasteError('')
    setPasteSuccess(null)

    try {
      const res = await fetch('/api/vocabulary/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText, listName })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to process text')
      setPasteSuccess({
        listId: data.vocabularyList.id,
        count: data.vocabularyCount,
        name: data.vocabularyList.name
      })
      setPasteText('')
      setListName('')
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPasteLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Vocabulary List</h1>
          <p className="text-gray-600 mt-1">
            Upload a document or paste text to create a vocabulary list
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'file'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Upload File
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Paste Text
          </button>
        </div>

        {/* File Upload Tab */}
        {activeTab === 'file' && (
          <>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onUploadUpdate={handleUploadUpdate}
            />

            {uploads.length > 0 && (
              <div className="mt-12">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h2>
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{upload.originalFilename}</p>
                          <p className="text-sm text-gray-500">
                            {(upload.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="flex items-center">
                          {upload.processingStatus === 'completed' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Completed
                            </span>
                          )}
                          {upload.processingStatus === 'processing' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing
                            </span>
                          )}
                          {upload.processingStatus === 'failed' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Paste Text Tab */}
        {activeTab === 'paste' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-gray-600 mb-6 text-sm">
              Paste any text below — Chinese characters, English words, or a mix. AI will extract and build your vocabulary list.
            </p>

            {/* Success state */}
            {pasteSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-800 font-medium">
                    Created {pasteSuccess.count} vocabulary items!
                  </p>
                  <p className="text-green-700 text-sm mt-0.5">{pasteSuccess.name}</p>
                  <Link
                    href={`/vocabulary/${pasteSuccess.listId}`}
                    className="inline-flex items-center text-green-700 hover:text-green-900 text-sm font-medium mt-2"
                  >
                    View vocabulary list →
                  </Link>
                </div>
              </div>
            )}

            {/* Error state */}
            {pasteError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{pasteError}</p>
              </div>
            )}

            {/* List name input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={listName}
                onChange={e => setListName(e.target.value)}
                placeholder="e.g. HSK 4 words, Travel vocab, Chapter 5..."
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Text area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text
              </label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={10}
                placeholder="Paste anything here:&#10;&#10;• Chinese: 你好 再见 谢谢 朋友&#10;• English: hello, goodbye, thank you, friend&#10;• Mixed: 你好 hello 再见 goodbye&#10;• Full sentences, paragraphs, word lists — any format works"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">{pasteText.length.toLocaleString()} characters</p>
            </div>

            {/* Submit button */}
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim() || pasteLoading}
              className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              {pasteLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating vocabulary list…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Vocabulary List
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
