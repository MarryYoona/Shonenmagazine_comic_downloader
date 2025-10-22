// ==UserScript==
// @name         shonenmagazine_comic_downloader
// @namespace    https://pocket.shonenmagazine.com/
// @version      2024-06-12
// @description
// @author       DHM
// @match        https://pocket.shonenmagazine.com/title/*/episode/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==
(function() {
    'use strict';

    const getEpisodeInfo = () => {
        const urlMatch = window.location.href.match(/title\/(\d+)\/episode\/(\d+)/);
        return {
            titleId: urlMatch ? urlMatch[1] : "unknown",
            episodeId: urlMatch ? urlMatch[2] : "unknown",
            title: document.title.split("|")[0].trim() || "未知漫画"
        };
    };
    const episode = getEpisodeInfo();
    const CONFIG = {
        IMAGE_REGEX: /https?:\/\/mgpk-cdn\.magazinepocket\.com\/static\/web_titles\/\d+\/episodes\/\d+\/[a-f0-9]+\.(jpg|png)(\?.*)?/i,
        EXCLUDE_REGEX: /(ads|thumbnail|crossdomain)/i,
        THUMBNAIL_COLUMNS: 2,
        GRID: 4,
        CROP: { width: null, height: null, x: 0, y: 0 },
        TILE: { width: 0, height: 0 },
        RESTORE: { mapping: [], scrambleSeed: null }
    };

    GM_addStyle(`
        .comic-downloader {
            position: fixed; top: 20px; right: 20px;
            width: 90vw; max-width: 550px; max-height: 85vh;
            overflow-y: auto; background: #fff; border: 2px solid #0c3494; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 9998; padding: 12px;
            font-family: Arial, "Microsoft YaHei", sans-serif; box-sizing: border-box;
        }

        .downloader-header { margin-bottom: 12px; text-align: center; }
        .downloader-title { font-size: 17px; font-weight: bold; color: #0c3494; margin: 0 0 6px; }
        .episode-info { font-size: 12px; color: #666; margin: 0; }

        .crop-control-group { margin: 8px 0; padding: 0 5px; }
        .crop-label { font-size: 13px; color: #333; margin-bottom: 4px; display: block; }
        .crop-input-group { display: flex; gap: 6px; align-items: center; justify-content: center; }
        .crop-input { width: 90px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
        .crop-confirm {
            padding: 4px 8px; border: none; border-radius: 4px;
            background: #ff7600; color: #fff; font-size: 12px; cursor: pointer;
        }
        .crop-desc { font-size: 11px; color: #666; margin: 3px 0 0 5px; }

        .seed-input-group { display: flex; gap: 8px; margin: 8px 0; padding: 0 5px; }
        .seed-input { flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
        .seed-confirm {
            padding: 5px 12px; border: none; border-radius: 4px;
            background: #0c3494; color: #fff; font-size: 13px; cursor: pointer;
        }

        .close-btn {
            position: absolute; top: 12px; right: 12px;
            background: #ff4444; color: #fff; border: none; border-radius: 50%;
            width: 22px; height: 22px; font-size: 14px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; padding: 0;
        }

        .action-btn-group {
            display: flex; justify-content: center; gap: 8px;
            margin: 10px 0; flex-wrap: wrap;
        }
        .action-btn {
            padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer;
            font-size: 13px; min-width: 100px; color: #fff;
        }
        .action-btn:disabled { background: #ccc; cursor: not-allowed; }
        .extract-btn { background: #ff7600; }
        .batch-restore-btn { background: #4285f4; }
        .batch-download-btn { background: #33c528; }

        .img-list {
            display: grid; grid-template-columns: repeat(${CONFIG.THUMBNAIL_COLUMNS}, 1fr);
            gap: 8px; list-style: none; padding: 0; margin: 0;
        }
        .img-item {
            border: 1px solid #eee; border-radius: 4px; overflow: hidden;
            position: relative; cursor: pointer;
        }
        .page-num {
            position: absolute; top: 3px; left: 3px;
            background: rgba(0,0,0,0.6); color: #fff; font-size: 11px;
            padding: 1px 3px; border-radius: 2px;
        }
        .img-status {
            position: absolute; top: 3px; right: 3px;
            background: rgba(66,133,244,0.8); color: #fff; font-size: 9px;
            padding: 1px 3px; border-radius: 2px;
        }
        .img-thumbnail {
            width: 100%; height: auto; aspect-ratio: 3/2; object-fit: contain;
            background: #f5f5f5;
        }
        .img-btn-group { display: flex; flex-direction: column; }
        .restore-btn {
            flex: 1; background: #4285f4; color: #fff;
            border: none; cursor: pointer; font-size: 11px;
        }
        .download-btn {
            flex: 1; background: #2196F3; color: #fff;
            border: none; cursor: pointer; font-size: 11px;
        }
        .download-btn:disabled { background: #ccc; cursor: not-allowed; }

        .status-txt {
            color: #666; text-align: center; padding: 12px 0; font-size: 13px;
            background: #fafafa; border-radius: 4px; margin: 0;
        }
        .tip-box {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8); color: #fff; padding: 10px 16px;
            border-radius: 4px; font-size: 13px; z-index: 10000;
            opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
        .tip-box.show { opacity: 1; pointer-events: auto; }

        .img-preview {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.9); z-index: 10001;
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .preview-img { max-width: 90%; max-height: 90vh; }
        .close-preview {
            position: absolute; top: 20px; right: 20px;
            background: #fff; color: #000; border: none; border-radius: 50%;
            width: 36px; height: 36px; font-size: 20px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }

        @media (max-width: 576px) {
            .comic-downloader { width: 95vw; top: 10px; right: 2.5vw; padding: 10px; }
            .img-list { grid-template-columns: 1fr; }
            .action-btn-group, .crop-input-group, .seed-input-group {
                flex-direction: column; padding: 0 10px; gap: 6px;
            }
            .action-btn, .crop-input, .seed-input, .crop-confirm { width: 100%; }
        }
    `);

    let comicImages = new Map();
    let viewerUI = null;
    let tipBox = null;
    const originalFetch = window.fetch;
    const originalXHR = XMLHttpRequest;

    const showTip = (text, duration = 2000) => {
        if (!tipBox) return;
        tipBox.classList.remove("show");
        window.tipTimer && clearTimeout(window.tipTimer);
        tipBox.textContent = text;
        tipBox.classList.add("show");
        window.tipTimer = setTimeout(() => tipBox.classList.remove("show"), duration);
    };

    const loadImageAndGetSize = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => reject(new Error("图片加载失败,无法获取分辨率"));
        });
    };

    const createPreview = (imgUrl) => {
        const preview = document.createElement("div");
        preview.className = "img-preview";
        preview.innerHTML = `<button class="close-preview">×</button><img class="preview-img" src="${imgUrl}" alt="预览">`;
        document.body.appendChild(preview);
        preview.querySelector(".close-preview").onclick = () => preview.remove();
        preview.onclick = (e) => e.target === preview && preview.remove();
    };

    const getFileName = (pageNum) => {
        const total = comicImages.size;
        const totalDigitLength = total.toString().length;
        const paddedNum = pageNum.toString().padStart(totalDigitLength, "0");
        return `${paddedNum}.jpg`;
    };

    const autoFillCropDefault = async (firstImgUrl) => {
        if (!firstImgUrl || CONFIG.CROP.width) return;
        try {
            const { width, height } = await loadImageAndGetSize(firstImgUrl);
            CONFIG.CROP.width = width;
            CONFIG.CROP.height = height;
            const [cropWidthInput, cropHeightInput] = [
                viewerUI.querySelector(".crop-width-input"),
                viewerUI.querySelector(".crop-height-input")
            ];
            if (cropWidthInput && cropHeightInput) {
                cropWidthInput.value = width;
                cropHeightInput.value = height;
            }
            showTip(`CROP初始值已填充:${width}x${height}(需点击确认CROP)`);
        } catch (err) {
            CONFIG.CROP.width = 1120;
            CONFIG.CROP.height = 1600;
            viewerUI.querySelector(".crop-width-input").value = 1120;
            viewerUI.querySelector(".crop-height-input").value = 1600;
            showTip(`获取分辨率失败,CROP初始值设为1120x1600(需确认)`);
        }
    };

    const updateCropManually = () => {
        const [cropWidthInput, cropHeightInput] = [
            viewerUI.querySelector(".crop-width-input"),
            viewerUI.querySelector(".crop-height-input")
        ];
        const width = parseInt(cropWidthInput.value.trim());
        const height = parseInt(cropHeightInput.value.trim());

        if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
            showTip("请输入有效的正数尺寸");
            return false;
        }

        CONFIG.CROP.width = width;
        CONFIG.CROP.height = height;
        CONFIG.TILE.width = width / CONFIG.GRID;
        CONFIG.TILE.height = height / CONFIG.GRID;
        if (CONFIG.RESTORE.scrambleSeed) {
            CONFIG.RESTORE.mapping = generateMapping(CONFIG.RESTORE.scrambleSeed);
        }

        showTip(`CROP已确认:${width}x${height}(tile:${CONFIG.TILE.width}x${CONFIG.TILE.height})`);
        renderImageList();
        return true;
    };

    const generateMapping = (seed) => {
        const fragmentCount = CONFIG.GRID * CONFIG.GRID;
        const ve = function*(a) {
            const e = Uint32Array.of(a);
            for (;;) {
                e[0] ^= e[0] << 13;
                e[0] ^= e[0] >>> 17;
                e[0] ^= e[0] << 5;
                yield e[0];
            }
        };
        const ce = (a, e) => {
            const s = ve(e);
            return a.map(t => [s.next().value, t])
                .sort((t, u) => +(t[0] > u[0]) - +(u[0] > t[0]))
                .map(t => t[1]);
        };
        const originalTiles = Array.from({ length: fragmentCount }, (_, i) => ({
            b: [Math.floor(i / CONFIG.GRID), i % CONFIG.GRID],
            currentIdx: i
        }));
        const shuffledTiles = ce(originalTiles, seed);
        return shuffledTiles.map((tile, finalIdx) => ({
            b: tile.b,
            a: [Math.floor(finalIdx / CONFIG.GRID), finalIdx % CONFIG.GRID]
        }));
    };

    const restoreImage = async (pageNum) => {
        const imgInfo = comicImages.get(pageNum);
        if (!imgInfo || imgInfo.isRestored) return;
        if (!CONFIG.RESTORE.scrambleSeed) {
            showTip("请先输入并确认种子");
            return;
        }
        if (!CONFIG.CROP.width || !CONFIG.CROP.height) {
            showTip("请先确认CROP尺寸");
            return;
        }

        try {
            showTip(`还原第${pageNum}页...`);
            const rawImg = new Image();
            rawImg.crossOrigin = "Anonymous";
            rawImg.src = imgInfo.rawUrl;
            await new Promise((resolve, reject) => {
                rawImg.onload = resolve;
                rawImg.onerror = () => reject(new Error("请安装Allow CORS插件"));
            });

            const cropCanvas = document.createElement("canvas");
            const cropCtx = cropCanvas.getContext("2d");
            cropCanvas.width = CONFIG.CROP.width;
            cropCanvas.height = CONFIG.CROP.height;
            cropCtx.drawImage(
                rawImg,
                CONFIG.CROP.x, CONFIG.CROP.y, CONFIG.CROP.width, CONFIG.CROP.height,
                0, 0, CONFIG.CROP.width, CONFIG.CROP.height
            );

            const targetCanvas = document.createElement("canvas");
            const targetCtx = targetCanvas.getContext("2d");
            targetCanvas.width = rawImg.width;
            targetCanvas.height = rawImg.height;

            CONFIG.RESTORE.mapping.forEach(item => {
                const [bRow, bCol] = item.b;
                const [aRow, aCol] = item.a;
                targetCtx.drawImage(
                    cropCanvas,
                    bCol * CONFIG.TILE.width, bRow * CONFIG.TILE.height,
                    CONFIG.TILE.width, CONFIG.TILE.height,
                    aCol * CONFIG.TILE.width, aRow * CONFIG.TILE.height,
                    CONFIG.TILE.width, CONFIG.TILE.height
                );
            });

            const remainWidth = rawImg.width - CONFIG.CROP.width;
            if (remainWidth > 0) {
                targetCtx.drawImage(
                    rawImg,
                    CONFIG.CROP.width, 0, remainWidth, rawImg.height,
                    CONFIG.CROP.width, 0, remainWidth, rawImg.height
                );
            }

            comicImages.set(pageNum, {
                ...imgInfo,
                restoredUrl: targetCanvas.toDataURL("image/jpeg", 0.9),
                isRestored: true
            });
            renderImageList();
            showTip(`第${pageNum}页还原成功`);
        } catch (err) {
            showTip(`还原失败:${err.message}`);
        }
    };

    const batchRestore = async () => {
        const total = comicImages.size;
        if (total === 0) return showTip("暂无图片");
        if (!CONFIG.RESTORE.scrambleSeed) return showTip("请先输入种子");
        if (!CONFIG.CROP.width) return showTip("请先确认CROP尺寸");

        showTip(`批量还原(共${total}张)`);
        let success = 0;
        const sortedPages = Array.from(comicImages.entries()).sort((a, b) => a[0] - b[0]);

        for (const [pageNum] of sortedPages) {
            if (!comicImages.get(pageNum).isRestored) {
                await restoreImage(pageNum);
                if (comicImages.get(pageNum).isRestored) success++;
            } else {
                success++;
            }
        }

        showTip(`还原完成:${success}/${total}张`);
        renderImageList();
    };

    const extractImages = async () => {
        setTimeout(async () => {
            try {
                const imageUrls = new Set();
                performance.getEntriesByType('resource').forEach(res => {
                    if (CONFIG.IMAGE_REGEX.test(res.name) && !CONFIG.EXCLUDE_REGEX.test(res.name)) {
                        imageUrls.add(res.name);
                    }
                });
                document.querySelectorAll('img[src*="mgpk-cdn"]').forEach(img => {
                    if (CONFIG.IMAGE_REGEX.test(img.src)) imageUrls.add(img.src);
                });

                let newCount = 0;
                imageUrls.forEach(url => {
                    if (!Array.from(comicImages.values()).some(i => i.rawUrl === url)) {
                        comicImages.set(comicImages.size + 1, { rawUrl: url, restoredUrl: null, isRestored: false });
                        newCount++;
                    }
                });

                if (newCount > 0 && !CONFIG.CROP.width) {
                    await autoFillCropDefault(Array.from(imageUrls)[0]);
                }

                showTip(`提取成功:${newCount}张(总计${comicImages.size}张)`);
                renderImageList();
            } catch (err) {
                showTip("提取失败,请刷新页面");
            }
        }, 500);
    };

    const downloadImage = (pageNum) => {
        const imgInfo = comicImages.get(pageNum);
        if (!imgInfo.isRestored) return showTip("请先还原");

        const link = document.createElement("a");
        link.href = imgInfo.restoredUrl;
        link.download = getFileName(pageNum);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showTip(`第${pageNum}页下载完成`);
    };

    const batchDownload = () => {
        const restored = Array.from(comicImages.entries())
            .sort((a, b) => a[0] - b[0])
            .filter(([_, img]) => img.isRestored);

        if (restored.length === 0) return showTip("暂无已还原图片");
        showTip(`批量下载(共${restored.length}张)`);
        restored.forEach(([pageNum], idx) => {
            setTimeout(() => downloadImage(pageNum), idx * 500);
        });
    };

    const renderImageList = () => {
        if (!viewerUI) return;
        const [imgListEl, statusTxt, batchRestoreBtn, batchDownloadBtn, seedInput] = [
            viewerUI.querySelector(".img-list"),
            viewerUI.querySelector(".status-txt"),
            viewerUI.querySelector(".batch-restore-btn"),
            viewerUI.querySelector(".batch-download-btn"),
            viewerUI.querySelector(".seed-input")
        ];

        imgListEl.innerHTML = "";
        const total = comicImages.size;
        const restored = Array.from(comicImages.values()).filter(img => img.isRestored).length;
        statusTxt.textContent = `已提取${total}张 | 已还原${restored}张 | 种子: ${CONFIG.RESTORE.scrambleSeed || "未输入"} | CROP: ${CONFIG.CROP.width || "未确认"}x${CONFIG.CROP.height || "未确认"}`;
        batchRestoreBtn.disabled = restored === total || !CONFIG.RESTORE.scrambleSeed || !CONFIG.CROP.width || total === 0;
        batchDownloadBtn.disabled = restored === 0;
        seedInput.value = CONFIG.RESTORE.scrambleSeed || "";

        if (total === 0) {
            statusTxt.textContent = "请先翻页加载图片,再提取图片";
            batchRestoreBtn.disabled = true;
            batchDownloadBtn.disabled = true;
            return;
        }

        Array.from(comicImages.entries()).sort((a, b) => a[0] - b[0]).forEach(([pageNum, imgInfo]) => {
            const li = document.createElement("li");
            li.className = "img-item";
            li.innerHTML = `
                <div class="page-num">第${pageNum}页</div>
                <div class="img-status">${imgInfo.isRestored ? "已还原" : "待还原"}</div>
                <img class="img-thumbnail" src="${imgInfo.isRestored ? imgInfo.restoredUrl : imgInfo.rawUrl}" alt="第${pageNum}页">
                <div class="img-btn-group">
                    ${imgInfo.isRestored ?
                        '<button class="download-btn">下载</button>' :
                        '<button class="restore-btn">还原</button><button class="download-btn" disabled>下载</button>'
                    }
                </div>
            `;

            li.addEventListener("click", (e) => {
                if (e.target.classList.contains("img-thumbnail") || e.target === li) {
                    createPreview(imgInfo.isRestored ? imgInfo.restoredUrl : imgInfo.rawUrl);
                }
            });

            const restoreBtn = li.querySelector(".restore-btn");
            if (restoreBtn) {
                restoreBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    restoreImage(pageNum);
                });
            }

            const downloadBtn = li.querySelector(".download-btn");
            if (downloadBtn) {
                downloadBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    downloadImage(pageNum);
                });
            }

            imgListEl.appendChild(li);
        });
    };

    const createUI = () => {
        const oldUI = document.querySelector(".comic-downloader");
        if (oldUI) oldUI.remove();

        viewerUI = document.createElement("div");
        viewerUI.className = "comic-downloader";
        viewerUI.innerHTML = `
            <div class="downloader-header">
                <h3 class="downloader-title">Shonenmagazine漫画下载器</h3>
                <p class="episode-info">当前章节:${episode.title}(ID:${episode.episodeId})</p>

                <div class="seed-input-group">
                    <input type="number" class="seed-input" placeholder="输入种子">
                    <button class="seed-confirm">确认种子</button>
                </div>

                <div class="crop-control-group">
                    <label class="crop-label">CROP尺寸</label>
                    <div class="crop-input-group">
                        <input type="number" class="crop-input crop-width-input" placeholder="宽度(像素)">
                        <span>x</span>
                        <input type="number" class="crop-input crop-height-input" placeholder="高度(像素)">
                        <button class="crop-confirm">确认CROP</button>
                    </div>
                    <p class="crop-desc">提示:若还原错误,请重新设置CROP尺寸</p>
                </div>
            </div>
            <button class="close-btn">×</button>
            <div class="action-btn-group">
                <button class="action-btn extract-btn">提取图片</button>
                <button class="action-btn batch-restore-btn" disabled>批量还原</button>
                <button class="action-btn batch-download-btn" disabled>批量下载</button>
            </div>
            <div class="status-txt">请先翻页加载图片,再提取</div>
            <ul class="img-list"></ul>
        `;
        document.body.appendChild(viewerUI);

        viewerUI.querySelector(".crop-confirm").addEventListener("click", updateCropManually);
        viewerUI.querySelector(".seed-confirm").addEventListener("click", () => {
            const seed = parseInt(viewerUI.querySelector(".seed-input").value.trim());
            if (seed && !isNaN(seed)) {
                CONFIG.RESTORE.scrambleSeed = seed;
                if (CONFIG.CROP.width) {
                    CONFIG.RESTORE.mapping = generateMapping(seed);
                }
                showTip(`种子已设置:${seed}`);
                renderImageList();
            } else {
                showTip("请输入有效的数字种子");
            }
        });
        viewerUI.querySelector(".extract-btn").addEventListener("click", extractImages);
        viewerUI.querySelector(".batch-restore-btn").addEventListener("click", batchRestore);
        viewerUI.querySelector(".batch-download-btn").addEventListener("click", batchDownload);
        viewerUI.querySelector(".close-btn").addEventListener("click", () => {
            viewerUI.remove();
            tipBox.remove();
            window.fetch = originalFetch;
            window.XMLHttpRequest = originalXHR;
        });
    };

    const init = () => {
        tipBox = document.createElement("div");
        tipBox.className = "tip-box";
        document.body.appendChild(tipBox);
        createUI();

        window.fetch = async function(input, init) {
            const response = await originalFetch(input, init);
            const url = typeof input === 'string' ? input : input.url;
            if (CONFIG.IMAGE_REGEX.test(url) && !CONFIG.EXCLUDE_REGEX.test(url)) {
                if (!Array.from(comicImages.values()).some(i => i.rawUrl === url)) {
                    comicImages.set(comicImages.size + 1, { rawUrl: url, restoredUrl: null, isRestored: false });
                    if (!CONFIG.CROP.width) {
                        autoFillCropDefault(url);
                    }
                    renderImageList();
                }
            }
            return response;
        };

        showTip("初始化完成,请翻页加载图片");
        renderImageList();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();