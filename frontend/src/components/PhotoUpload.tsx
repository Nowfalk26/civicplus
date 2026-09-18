import React, { useRef } from 'react';
import toast from 'react-hot-toast';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onChange,
  maxPhotos = 5,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const newPhotos: string[] = [...photos];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPhotos.push(event.target.result as string);
          onChange([...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-primary/40 hover:border-primary bg-primary-light/40 hover:bg-primary-light/70 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-on-surface">
            Tap to upload photos or take picture
          </p>
          <p className="text-xs text-on-surface-variant">
            புகைப்படங்களை பதிவேற்றவும் • Min 1, Max {maxPhotos} photos (JPEG, PNG, WEBP up to 10MB)
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Photo previews */}
      {photos.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant mb-2">
            <span>Uploaded Evidence ({photos.length}/{maxPhotos})</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check</span> Valid
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative group rounded-xl overflow-hidden aspect-square bg-surface-container border border-surface-container-high shadow-2xs"
              >
                <img
                  src={photo}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                  title="Remove photo"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
