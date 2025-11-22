(function () {
    const extensionName = "faye_phone";
    const uploadUrl = "/api/images/upload";

    function base64ToBlob(base64, mimeType = 'image/png') {
        // 处理可能存在的 Data URI 前缀
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    function handlePhoneUpload(event) {
        const data = event.data;
        if (!data || data.type !== 'FAYE_PHONE_UPLOAD' || !data.image) {
            return;
        }

        console.log(`[${extensionName}] Received image upload request.`);

        try {
            const blob = base64ToBlob(data.image);
            const formData = new FormData();
            // 生成唯一文件名
            const filename = `phone_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
            formData.append('avatar', blob, filename); 

            jQuery.ajax({
                url: uploadUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    // SillyTavern 返回的是路径字符串
                    const path = response; 
                    console.log(`[${extensionName}] Upload success: ${path}`);
                    
                    if (event.source) {
                        event.source.postMessage({
                            type: 'FAYE_PHONE_UPLOAD_SUCCESS',
                            path: path
                        }, '*');
                    }
                },
                error: function (err) {
                    console.error(`[${extensionName}] Upload failed:`, err);
                }
            });
        } catch (error) {
            console.error(`[${extensionName}] Error processing image:`, error);
        }
    }

    window.addEventListener('message', handlePhoneUpload);
    console.log(`[${extensionName}] Extension loaded.`);
})();