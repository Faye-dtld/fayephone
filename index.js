
import {
    getBase64Async,
    saveBase64AsFile,
    getStringHash
} from "../../../utils.js";

// 核心上传函数 - 复刻 Olivia-s-Toolkit (朋友的插件) 逻辑
// 这种方式利用了酒馆原生的上下文处理，生成的路径最容易被后端 AI 识别
async function adapterUpload(file) {
    if (!file) throw new Error("未检测到文件");

    console.log("[FayephoneSupport] 正在处理文件:", file.name, file.type);

    // 1. 获取 Base64 数据
    const base64Full = await getBase64Async(file);
    const base64Data = base64Full.split(",")[1];
    
    // 2. 确定扩展名
    let ext = 'png';
    if (file.type.startsWith('image/')) {
        ext = file.type.split('/')[1] || 'png';
    } else if (file.type.startsWith('audio/')) {
        ext = file.type.split('/')[1] || 'mp3';
    } else if (file.type.startsWith('video/')) {
        ext = file.type.split('/')[1] || 'mp4';
    }

    // 3. 获取上下文 (完全参考朋友的代码逻辑)
    // 必须通过 window.SillyTavern 获取当前聊天的角色信息，这样 saveBase64AsFile 才能把图片存到正确的位置
    let charName = "UserUploads"; // 默认兜底
    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            const currentCharacterId = ctx.characterId;
            const characters = ctx.characters;
            
            // 兼容不同版本的 characters 数据结构 (数组或对象)
            if (characters && currentCharacterId !== undefined && currentCharacterId !== null) {
                const character = characters[currentCharacterId];
                if (character && character.name) {
                    charName = character.name;
                }
            }
        }
    } catch (e) {
        console.warn("[FayephoneSupport] 获取角色上下文失败:", e);
    }

    // 4. 生成文件名
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;

    console.log(`[FayephoneSupport] 保存目标: Character=${charName}, File=${fileNamePrefix}.${ext}`);

    // 5. 保存文件
    // saveBase64AsFile 返回的是相对路径，例如 "UserUploads/CharName/file.png"
    // 这个路径正是酒馆后端和 AI 模型所需要的
    const savedPath = await saveBase64AsFile(
        base64Data,
        charName,
        fileNamePrefix,
        ext
    );

    // 6. 返回结果
    // 朋友的代码直接返回 url，我们也一样。不做多余的 decodeURI，保持原样给 HTML 使用。
    // 如果路径里有中文，saveBase64AsFile 通常已经处理好了。
    console.log("[FayephoneSupport] 文件保存成功，路径:", savedPath);
    
    return { url: savedPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Vision Fixed) 已加载成功！");
