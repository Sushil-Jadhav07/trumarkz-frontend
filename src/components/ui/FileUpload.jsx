import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileSpreadsheet, FileArchive, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const FileUpload = ({
  onFileSelect,
  accept = {},
  maxSize = 5242880,
  label = 'Drag & drop or click to upload',
  fileType = 'file',
  selectedFile,
  onRemove
}) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false
  });

  const fileIcons = {
    xlsx: FileSpreadsheet,
    zip: FileArchive,
    default: FileText
  };

  const getFileIcon = (name) => {
    if (name?.endsWith('.xlsx') || name?.endsWith('.xls')) return fileIcons.xlsx;
    if (name?.endsWith('.zip')) return fileIcons.zip;
    return fileIcons.default;
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile.name) : Upload;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-4 p-4 bg-brand-blue/5 border-2 border-brand-blue rounded-xl"
          >
            <div className="p-2 bg-brand-blue/10 rounded-lg">
              <FileIcon size={24} className="text-brand-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-dark font-inter truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 font-inter">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
              isDragActive ? 'border-brand-blue bg-brand-blue/5' : 'border-brand-gray hover:border-brand-blue hover:bg-gray-50'
            )}
          >
            <input {...getInputProps()} />
            <div className="p-3 bg-gray-100 rounded-full inline-flex mb-3">
              <Upload size={24} className={isDragActive ? 'text-brand-blue' : 'text-gray-400'} />
            </div>
            <p className="text-sm font-medium text-brand-dark font-inter mb-1">{label}</p>
            <p className="text-xs text-gray-500 font-inter">
              Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {fileRejections.length > 0 && (
        <p className="mt-2 text-xs text-red-500 font-inter">
          File too large or invalid format. Please try again.
        </p>
      )}
    </div>
  );
};

export default FileUpload;
