// SillyTavern Phone Support Plugin
// 使用动态导入以确保最大兼容性

console.log('[Phone Support] Plugin script initialization started...');

/**
 * 插件提供的图片上传函数
 * @param {File} file 图片文件对象
 * @returns {Promise<{url: string}>} 返回包含图片URL的对象
 */
window.__phone_uploadImage = async function (file) {
    console.log('[Phone Support] Received image upload request', file.name);
    
    // 动态导入 utils，避免模块加载错误
    const { getBase64Async, getStringHash, saveBase64AsFile } = await import('/scripts/utils.js');

    if (!file || typeof file !== "object" || !file.type.startsWith("image/")) {
        throw new Error("请选择图片文件！");
    }
    
    // 将文件转换为 base64 以便调用 SillyTavern 的保存 API
    const fileBase64 = await getBase64Async(file);
    const base64Data = fileBase64.split(",")[1];
    const extension = file.type.split("/")[1] || "png";
    
    // 生成唯一文件名
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;
    
    // 获取当前上下文（角色信息）
    // 注意：window.SillyTavern 在某些版本可能需要通过 import 获取，但通常挂载在 window 上
    const ctx = window.SillyTavern.getContext();
    const currentCharacterId = ctx.characterId;
    
    if (!currentCharacterId && currentCharacterId !== 0) {
        throw new Error("无法获取当前角色信息，请先选择一个角色。");
    }

    const characters = await ctx.characters;
    const character = characters[currentCharacterId];
    const characterName = character["name"];
    
    // 保存文件到角色目录
    const imageUrl = await saveBase64AsFile(
        base64Data,
        characterName,
        fileNamePrefix,
        extension
    );

    console.log('[Phone Support] Image saved to:', imageUrl);
    return { url: imageUrl };
};

/**
 * 插件提供的音频上传函数
 * @param {File} file 音频文件对象
 * @returns {Promise<{url: string}>} 返回包含音频URL的对象
 */
window.__phone_uploadFile = async function (file) {
    console.log('[Phone Support] Received audio upload request', file.name);
    
    // 动态导入 utils
    const { getBase64Async, getStringHash, saveBase64AsFile } = await import('/scripts/utils.js');

    if (!file || typeof file !== "object" || !file.type.startsWith("audio/")) {
        throw new Error("请选择一个音频文件！");
    }
    
    const fileBase64 = await getBase64Async(file);
    const base64Data = fileBase64.split(",")[1];
    const extension = file.type.split("/")[1] || "mp3";
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;
    
    const ctx = window.SillyTavern.getContext();
    const currentCharacterId = ctx.characterId;
    
    if (!currentCharacterId && currentCharacterId !== 0) {
        throw new Error("无法获取当前角色信息，请先选择一个角色。");
    }

    const characters = await ctx.characters;
    const character = characters[currentCharacterId];
    const characterName = character["name"];
    
    const fileUrl = await saveBase64AsFile(
        base64Data,
        characterName,
        fileNamePrefix,
        extension
    );

    console.log('[Phone Support] Audio saved to:', fileUrl);
    return { url: fileUrl };
};

console.log('[Phone Support] Plugin loaded successfully! Check window.__phone_uploadImage');
