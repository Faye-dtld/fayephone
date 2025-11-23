// SillyTavern Phone Support Plugin
// 使用动态导入以确保最大兼容性

console.log('[Phone Support] Plugin script executing...');

// 定义核心功能函数
const uploadImageImpl = async function (file) {
    console.log('[Phone Support] Received image upload request', file.name);
    
    // 动态导入 utils
    const { getBase64Async, getStringHash, saveBase64AsFile } = await import('/scripts/utils.js');

    if (!file || typeof file !== "object" || !file.type.startsWith("image/")) {
        throw new Error("请选择图片文件！");
    }
    
    const fileBase64 = await getBase64Async(file);
    const base64Data = fileBase64.split(",")[1];
    const extension = file.type.split("/")[1] || "png";
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;
    
    // 尝试获取上下文
    let ctx;
    if (window.SillyTavern && window.SillyTavern.getContext) {
        ctx = window.SillyTavern.getContext();
    } else if (window.parent && window.parent.SillyTavern && window.parent.SillyTavern.getContext) {
        ctx = window.parent.SillyTavern.getContext();
    } else {
        // 最后的尝试，动态导入 extension.js 获取上下文 (通常不需要，为了保险)
        const extModule = await import('/scripts/extensions.js');
        ctx = extModule.getContext();
    }

    const currentCharacterId = ctx.characterId;
    
    if (currentCharacterId === undefined || currentCharacterId === null) {
        throw new Error("无法获取当前角色信息，请先在酒馆选择一个角色。");
    }

    const characters = await ctx.characters;
    const character = characters[currentCharacterId];
    const characterName = character ? character["name"] : null;

    if (!characterName) {
        throw new Error("找不到角色名，请确保已加载角色。");
    }
    
    const imageUrl = await saveBase64AsFile(
        base64Data,
        characterName,
        fileNamePrefix,
        extension
    );

    console.log('[Phone Support] Image saved to:', imageUrl);
    return { url: imageUrl };
};

const uploadFileImpl = async function (file) {
    console.log('[Phone Support] Received audio upload request', file.name);
    
    const { getBase64Async, getStringHash, saveBase64AsFile } = await import('/scripts/utils.js');

    if (!file || typeof file !== "object" || !file.type.startsWith("audio/")) {
        throw new Error("请选择一个音频文件！");
    }
    
    const fileBase64 = await getBase64Async(file);
    const base64Data = fileBase64.split(",")[1];
    const extension = file.type.split("/")[1] || "mp3";
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;
    
    let ctx;
    if (window.SillyTavern && window.SillyTavern.getContext) {
        ctx = window.SillyTavern.getContext();
    } else if (window.parent && window.parent.SillyTavern && window.parent.SillyTavern.getContext) {
        ctx = window.parent.SillyTavern.getContext();
    } else {
        const extModule = await import('/scripts/extensions.js');
        ctx = extModule.getContext();
    }

    const currentCharacterId = ctx.characterId;
    if (currentCharacterId === undefined || currentCharacterId === null) throw new Error("无法获取当前角色信息");

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

// 挂载函数到所有可能的全局对象上，确保 iframe 能访问
function mountApi() {
    const apiNameImage = '__phone_uploadImage';
    const apiNameFile = '__phone_uploadFile';

    // 1. 挂载到当前窗口 (Plugin Scope)
    window[apiNameImage] = uploadImageImpl;
    window[apiNameFile] = uploadFileImpl;

    // 2. 挂载到父窗口 (如果存在) - 这是 iframe 最常用的访问路径
    if (window.parent && window.parent !== window) {
        window.parent[apiNameImage] = uploadImageImpl;
        window.parent[apiNameFile] = uploadFileImpl;
        console.log('[Phone Support] Mounted API to window.parent');
    }

    // 3. 挂载到顶层窗口 (如果存在)
    if (window.top && window.top !== window && window.top !== window.parent) {
        window.top[apiNameImage] = uploadImageImpl;
        window.top[apiNameFile] = uploadFileImpl;
        console.log('[Phone Support] Mounted API to window.top');
    }

    console.log(`[Phone Support] Functions mounted: window.${apiNameImage}`);
    
    // 弹出成功提示 (如果 toastr 可用)
    if (typeof toastr !== 'undefined') {
        toastr.success('小手机文件上传支持已就绪', 'Phone Support 插件已加载');
    } else if (window.parent && typeof window.parent.toastr !== 'undefined') {
        window.parent.toastr.success('小手机文件上传支持已就绪', 'Phone Support 插件已加载');
    }
}

// 执行挂载
mountApi();
