// Simple function to fetch image data from WordPress API
const imageCollection = async (mediaId, apiUrl) => {
    const fields = [
        'id',
        'slug',
        'alt_text', 
        'media_details',
        'source_url',
        'mime_type'
    ].join(',');
    
    const response = await fetch(`${apiUrl}/media/${mediaId}?_fields=${fields}`);
    const imageData = await response.json();
    
    // Return organized image data with download URLs
    return {
        id: imageData.id,
        slug: imageData.slug,
        altText: imageData.alt_text || '',
        mimeType: imageData.mime_type,
        downloads: prepareDownloadList(imageData)
    };
};

// Prepare list of images to download with their target filenames
const prepareDownloadList = (imageData) => {
    const downloads = [];
    const sizes = imageData.media_details?.sizes || {};
    
    // Add full size image with dimensions from main media_details
    if (imageData.source_url) {
        downloads.push({
            url: imageData.source_url,
            filename: `full${getFileExtension(imageData.source_url)}`,
            size: 'full',
            width: imageData.media_details?.width || null,
            height: imageData.media_details?.height || null
        });
    }
    
    // Add all size variants with their specific dimensions
    for (const [sizeName, sizeData] of Object.entries(sizes)) {
        if (sizeData.source_url) {
            downloads.push({
                url: sizeData.source_url,
                filename: `${sizeName}${getFileExtension(sizeData.source_url)}`,
                size: sizeName,
                width: sizeData.width || null,
                height: sizeData.height || null
            });
        }
    }
    
    return downloads;
};

const getFileExtension = (url) => {
    const match = url.match(/\.(png|jpg|jpeg|gif|webp)$/i);
    return match ? `.${match[1].toLowerCase()}` : '.png';
};

export { imageCollection };