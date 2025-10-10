import { BookOpen, Upload } from 'lucide-react';
import PDFList from '@/components/PDFList';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  PDF Search & QA System
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Upload, search, and ask questions about your PDF documents
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                // TODO: Implement upload modal
                alert('Upload functionality to be implemented');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Upload className="w-5 h-5" />
              Upload PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Your PDFs</h2>
          <p className="text-gray-600 mt-1">
            Click on any PDF to view, search, and ask questions
          </p>
        </div>

        <PDFList />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 text-sm">
            PDF Search & QA System - Powered by LLM and Vector Search
          </p>
        </div>
      </footer>
    </div>
  );
}
