// Add this to the handleImageSelect function

const handleImageSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    setImage(file);
    setError('');
    
    // Check if it's HEIC/HEIF format
    const isHEIC = file.type === 'image/heic' || 
                   file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif');
    
    if (isHEIC) {
      // Show placeholder for HEIC
      setPreview('heic-placeholder');
    } else {
      // Normal preview for JPG/PNG
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }
};
