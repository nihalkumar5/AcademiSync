export interface ProcessedFile {
  name: string;
  base64: string;
  mimeType: string;
}

export async function processFileForAi(file: File): Promise<ProcessedFile> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name,
          base64: (e.target?.result as string) || '',
          mimeType: 'application/pdf',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Compress and resize images via Canvas for fast upload and vision OCR
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve({
            name: file.name,
            base64: compressed,
            mimeType: 'image/jpeg',
          });
        } else {
          resolve({
            name: file.name,
            base64: (e.target?.result as string) || '',
            mimeType: file.type || 'image/jpeg',
          });
        }
      };
      img.onerror = () => {
        resolve({
          name: file.name,
          base64: (e.target?.result as string) || '',
          mimeType: file.type || 'image/jpeg',
        });
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => {
      resolve({
        name: file.name,
        base64: '',
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function processMultipleFilesForAi(files: File[]): Promise<ProcessedFile[]> {
  const promises = files.map((file) => processFileForAi(file));
  return Promise.all(promises);
}
