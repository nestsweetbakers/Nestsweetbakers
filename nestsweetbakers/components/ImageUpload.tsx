'use client';

import { useState } from 'react';
import { Upload, X, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value: string | string[];
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  maxImages?: number;
  label?: string;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  multiple = false, 
  maxImages = 5,
  label = 'Upload Image'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : []
  );

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'nestsweetbakers'); // Change this to your upload preset
    
    try {
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/nestsweetbakery/image/upload', // Change 'nestsweetbakery' to your cloud name
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary error:', errorData);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (multiple && preview.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);

      if (multiple) {
        const newUrls = [...preview, ...urls].slice(0, maxImages);
        setPreview(newUrls);
        onChange(newUrls);
      } else {
        setPreview([urls[0]]);
        onChange(urls[0]);
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setError(error.message || 'Failed to upload. Please use image URL instead.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newPreview = preview.filter((_, i) => i !== index);
    setPreview(newPreview);
    onChange(multiple ? newPreview : newPreview[0] || '');
  };

  const handleUrlAdd = (url: string) => {
    if (!url) return;
    
    if (multiple) {
      if (preview.length < maxImages) {
        const newUrls = [...preview, url];
        setPreview(newUrls);
        onChange(newUrls);
      } else {
        setError(`Maximum ${maxImages} images allowed`);
        setTimeout(() => setError(null), 3000);
      }
    } else {
      setPreview([url]);
      onChange(url);
    }
  };

  const canAddMore = !multiple || preview.length < maxImages;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">
        {label} {multiple && `(${preview.length}/${maxImages})`}
      </label>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Preview Grid */}
      {preview.length > 0 && (
        <div className={`grid gap-4 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {preview.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                <Image
                  src={url}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={url.includes('blob:')}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              {multiple && (
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold shadow-md">
                  #{index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Section */}
      {canAddMore && (
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              id={`image-upload-${label.replace(/\s+/g, '-')}`}
            />
            <label
              htmlFor={`image-upload-${label.replace(/\s+/g, '-')}`}
              className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all cursor-pointer ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin text-pink-600" size={20} />
                  <span className="text-gray-600 font-medium">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="text-gray-400" size={20} />
                  <div className="text-center">
                    <span className="text-gray-600 font-medium block">
                      {preview.length === 0 ? 'Click to upload or drag and drop' : 'Add more images'}
                    </span>
                    <span className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</span>
                  </div>
                </>
              )}
            </label>
          </div>

          {/* URL Input */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <LinkIcon size={12} />
                OR PASTE IMAGE URL
              </span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                id={`url-input-${label.replace(/\s+/g, '-')}`}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(`url-input-${label.replace(/\s+/g, '-')}`) as HTMLInputElement;
                  const url = input.value.trim();
                  if (url) {
                    handleUrlAdd(url);
                    input.value = '';
                  }
                }}
                className="px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all font-semibold text-sm whitespace-nowrap"
              >
                Add URL
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Paste image URL and click &quot;Add URL&quot;</p>
          </div>
        </div>
      )}

      {/* Cloudinary Setup Notice */}
      {preview.length === 0 && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-2">📝 Image Upload Setup:</p>
          <ul className="text-xs text-blue-600 space-y-1 ml-4 list-disc">
            <li>For file uploads: Configure Cloudinary (see console)</li>
            <li>Or simply paste image URLs from any source</li>
            <li>Recommended: Use Cloudinary, ImgBB, or direct URLs</li>
          </ul>
        </div>
      )}
    </div>
  );
}
