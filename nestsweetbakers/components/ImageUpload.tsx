'use client';

import { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
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
  const [preview, setPreview] = useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : []
  );

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'nestsweetbakers'); // Replace with your Cloudinary upload preset
    formData.append('cloud_name', 'nestsweetbakery'); // Replace with your Cloudinary cloud name

    try {
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/nestsweetbakery/image/upload', // Replace with your Cloudinary cloud name
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
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

    // Check if adding these files would exceed the max
    if (multiple && preview.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

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
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newPreview = preview.filter((_, i) => i !== index);
    setPreview(newPreview);
    onChange(multiple ? newPreview : newPreview[0] || '');
  };

  const canAddMore = !multiple || preview.length < maxImages;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">
        {label} {multiple && `(${preview.length}/${maxImages})`}
      </label>

      {/* Preview Grid */}
      {preview.length > 0 && (
        <div className={`grid gap-4 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {preview.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              {multiple && (
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold">
                  #{index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {canAddMore && (
        <div>
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id={`image-upload-${label}`}
          />
          <label
            htmlFor={`image-upload-${label}`}
            className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all cursor-pointer ${
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
                <span className="text-gray-600 font-medium">
                  {preview.length === 0 ? 'Upload Image' : 'Add More Images'}
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* URL Input Alternative */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-500 font-medium">OR PASTE URL</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>
        <input
          type="url"
          placeholder="https://example.com/image.jpg"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const url = (e.target as HTMLInputElement).value.trim();
              if (url) {
                if (multiple) {
                  if (preview.length < maxImages) {
                    const newUrls = [...preview, url];
                    setPreview(newUrls);
                    onChange(newUrls);
                    (e.target as HTMLInputElement).value = '';
                  } else {
                    alert(`Maximum ${maxImages} images allowed`);
                  }
                } else {
                  setPreview([url]);
                  onChange(url);
                }
              }
            }
          }}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Press Enter to add URL</p>
      </div>
    </div>
  );
}
