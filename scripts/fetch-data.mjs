import * as fs from "fs";
import axios from "axios";
import path from "path";
import {writeJSONFile} from "./utils.mjs";

const STRAPI_URL = 'https://content.subwallet.app';
const RESOURCE_URL = 'https://static-data.subwallet.app';

const cacheConfigs = [
    {
        url: `${STRAPI_URL}/api/list/chain`,
        folder: 'chains',
        fileName: 'list.json',
        imageFields: ['icon'],
        removeFields: ['id'],
        preview: 'preview.json',
        additionalProcess: [
            (data, preview_data, config, lang, isProduction) => {
                const {folder} = config;
                const combineData = Object.fromEntries(preview_data.map((c) => ([c.slug, c.icon])));
                const path = savePath(folder, getFileNameByLang('logo_map.json', lang))

                writeJSONFile(path, combineData).catch(console.error)
            }
        ]
    },
    {
        url: `${STRAPI_URL}/api/list/dapp`,
        folder: 'dapps',
        fileName: 'list.json',
        imageFields: ['icon', 'preview_image'],
        removeFields: [],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/category`,
        folder: 'categories',
        fileName: 'list.json',
        imageFields: [],
        removeFields: ['id'],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/airdrop-campaign`,
        folder: 'airdrop-campaigns',
        fileName: 'list.json',
        imageFields: ['logo', 'backdrop_image'],
        removeFields: [],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/crowdloan-fund`,
        folder: 'crowdloan-funds',
        fileName: 'list.json',
        imageFields: [],
        removeFields: ['id'],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/marketing-campaign`,
        folder: 'marketing-campaigns',
        fileName: 'list.json',
        imageFields: [],
        removeFields: [],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/buy-service-info`,
        folder: 'buy-service-infos',
        fileName: 'list.json',
        imageFields: [],
        removeFields: [],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/buy-token-config`,
        folder: 'buy-token-configs',
        fileName: 'list.json',
        imageFields: [],
        removeFields: [],
        preview: 'preview.json',
    },
    {
        url: `${STRAPI_URL}/api/list/instruction`,
        folder: 'instructions',
        fileName: 'list.json',
        imageFields: [],
        removeFields: [],
        preview: 'preview.json',
        langs: ['en', 'vi', 'zh', 'ja', 'ru'],
    },
    {
        url: `${STRAPI_URL}/api/list/change-log`,
        folder: 'change-logs',
        fileName: 'list.json',
        imageFields: [],
        removeFields: [],
        preview: 'preview.json',
        langs: ['en', 'vi', 'zh', 'ja', 'ru'],
    },
    {
        url: `${STRAPI_URL}/api/list/markdown-content`,
        folder: 'markdown-contents',
        fileName: 'list.json',
        imageFields: [],
        removeFields: [],
        preview: 'preview.json',
        langs: ['en', 'vi', 'zh', 'ja', 'ru'],
        additionalProcess: [
            (data, preview_data, config, lang, isProduction) => {
                if (data.length > 0 || preview_data.length > 0) {
                    const folderParent = config.folder;
                    for (const dataContent of preview_data) {
                        const prefix = isProduction ? config.fileName : config.preview;
                        const fileName = getFileNameByLang(prefix, lang);
                        const {folder, content, description} = dataContent;
                        const contentSave = {
                            content, description
                        }
                        const folderPath = saveFolderChild(folderParent, folder);
                        if (!fs.existsSync(folderPath)) {
                            fs.mkdirSync(folderPath, {recursive: true});
                        }
                        const filePath = saveFileInFolderChild(folderParent, folder, fileName);
                        writeJSONFile(filePath, contentSave).catch(console.error)
                    }
                }
            }
        ]
    },

    {
        url: `${STRAPI_URL}/api/list/chain-asset`,
        folder: 'chain-assets',
        fileName: 'list.json',
        imageFields: ['icon'],
        removeFields: ['id'],
        preview: 'preview.json',
        additionalProcess: [
            async (data, preview_data, config, lang, isProduction) => {
                // console.error('Processing data for chain-assets', preview_data)
                if (preview_data.length > 0 || data.length > 0) {
                    const {folder} = config;
                    const downloadDir = saveImagesPath(folder);
                    const chains = await Promise.all(preview_data.map(async asset => {
                        let iconURL = asset.icon;
                        if (iconURL) {
                            try {
                                const newFileName = await downloadFile(iconURL, downloadDir, asset.slug.toLowerCase());
                                iconURL = `${RESOURCE_URL}/assets/chain-assets/${newFileName}`;
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        return {
                            originChain: asset.originChain,
                            slug: asset.slug,
                            name: asset.name,
                            symbol: asset.symbol,
                            decimals: asset.decimals,
                            priceId: asset.priceId,
                            minAmount: asset.minAmount,
                            assetType: asset.assetType,
                            metadata: asset.metadata,
                            multiChainAsset: asset.multiChainAsset || null,
                            hasValue: asset.hasValue,
                            icon: iconURL
                        }
                    }));

                    const assetMap = Object.fromEntries(chains.map(chain => [chain.slug, chain]));

                    const refMap = {}
                    data.forEach((item) => {
                        const refs = item.assetRefs;
                        refs.forEach((ref) => {
                            const srcAsset = assetMap[item.slug];
                            const destSlug = ref.destAsset;
                            const destAsset = assetMap[destSlug];
                            if (destAsset) {
                                refMap[`${item.slug}___${destSlug}`] = {
                                    srcAsset: item.slug,
                                    destAsset: destAsset.slug,
                                    srcChain: srcAsset.originChain,
                                    destChain: destAsset.originChain,
                                    path: ref.type
                                }
                            }
                        });
                    });
                    const dataSave = {};
                    const disabledXcmChannels = [];
                    for (const item of preview_data) {
                        dataSave[item.slug] = item.priceId;
                        if (item.assetRefs && item.assetRefs.length > 0) {
                            for (const assetRef of item.assetRefs) {
                                if (assetRef.disable) {
                                    disabledXcmChannels.push(assetRef.destAsset)
                                }
                            }
                        }
                    }
                    const prefix = isProduction ? 'list-' : 'preview-';
                    const path = savePath(folder, `${prefix}price-map.json`);
                    const pathAsset = savePath(folder, `${prefix}asset.json`);
                    const pathAssetRef = savePath(folder, `${prefix}asset-ref.json`);
                    const pathDisabledXcmChannels = savePath(folder, `${prefix}disabled-xcm-channels.json`);

                    writeJSONFile(path, dataSave).catch(console.error)
                    writeJSONFile(pathAsset, assetMap).catch(console.error)
                    writeJSONFile(pathAssetRef, refMap).catch(console.error)
                    writeJSONFile(pathDisabledXcmChannels, disabledXcmChannels).catch(console.error)
                }
            }
        ]
    },
    {
        url: `${STRAPI_URL}/api/list/multi-chain-asset`,
        folder: 'multi-chain-assets',
        fileName: 'list.json',
        imageFields: ['icon'],
        removeFields: ['id'],
        preview: 'preview.json',
        additionalProcess: [
            async (data, preview_data, config, lang, isProduction) => {
                console.log('Processing data for multi-chain-assets', preview_data)
                if (preview_data.length > 0 || data.length > 0) {
                    const {folder} = config;
                    const downloadDir = saveImagesPath(folder);
                    const chains = await Promise.all(data.map(async mAsset => {
                        let iconURL = mAsset.icon;
                        if (iconURL) {
                            try {
                                const newFileName = await downloadFile(iconURL, downloadDir, mAsset.slug.toLowerCase());
                                iconURL = `${RESOURCE_URL}/assets/${folder}/${newFileName}`;
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        return {
                            slug: mAsset.slug,
                            originChainAsset: mAsset.originChainAsset,
                            name: mAsset.name,
                            symbol: mAsset.symbol,
                            priceId: mAsset.priceId,
                            hasValue: mAsset.hasValue,
                            icon: iconURL,
                        }
                    }));
                    const mAssetMap = Object.fromEntries(chains.map(chain => [chain.slug, chain]));
                    const prefix = isProduction ? 'list-' : 'preview-';
                    const pathAsset = savePath(folder, `${prefix}multi-asset.json`);
                    writeJSONFile(pathAsset, mAssetMap).catch(console.error)

                }
            }
        ]
    },
]

const savePath = (folder, fileName) => `data/${folder}/${fileName || 'list.json'}`;
const saveImagesPath = (folder) => `data/${folder}/images`;
const saveFolderChild = (folderParent, folder) => `data/${folderParent}/${folder}`;
const saveFileInFolderChild = (folderParent, folder, fileName) => `data/${folderParent}/${folder}/${fileName}`;
const urlImage = (folder, field, name) => `${RESOURCE_URL}/${folder}/images/${field}/${name}`;

export async function downloadFile(url, downloadDir, forceFileName = null) {
    // Create dir if not exist
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, {recursive: true});
    }

    // Download file with axios
    let fileName = url.split('/').pop();
    if (forceFileName) {
        fileName = forceFileName + '.' + fileName.split('.').pop();
    }
    const filePath = path.join(downloadDir, fileName);

    // Download and save file
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return await new Promise((resolve, reject) => {
        writer.on('finish', () => {
            resolve(fileName);
        });
        writer.on('error', () => {
            resolve(url);
        });
    });
}

const downloadedFiles = {};

const fetchAndProcessData = async (url, folder, downloadDir, fieldsImage) => {
    const results = await axios.get(url);

    if (!results.data) return;

    return await Promise.all(results.data.map(async item => {
        const dataImages = {};
        for (const field of fieldsImage) {
            const dataField = item[field];
            if (dataField) {
                const folderFieldImage = `${downloadDir}/${field}`;
                const imageKey = `${folderFieldImage}---${dataField}`;
                const cachedImage = downloadedFiles[imageKey];
                if (cachedImage) {
                    dataImages[field] = urlImage(folder, field, cachedImage);
                } else {
                    const newFileName = cachedImage || await downloadFile(dataField, folderFieldImage);
                    downloadedFiles[imageKey] = newFileName;
                    dataImages[field] = urlImage(folder, field, newFileName);
                }
            }
        }
        return {...item, ...dataImages};
    }));
}

const getFileNameByLang = (filename, lang) => {
    return lang === '' ? filename : filename.replace('.json', `-${lang}.json`)
}

const getUrl = (url, preview, lang) => {
    if (preview && lang !== '') {
        return `${url}?preview=true&locale=${lang}`
    } else if (preview) {
        return `${url}?preview=true`
    } else if (lang !== '') {
        return `${url}?locale=${lang}`
    } else {
        return url
    }
}

const main = async () => {
    // Filter config by folder
    const environment = process.argv[2];
    const isProduction = environment === 'production';
    const folder = process.argv[3];
    const configs = folder ? cacheConfigs.filter((c) => c.folder === folder) : cacheConfigs;
    for (const config of configs) {
        console.log('Caching data with config', config)
        const langs = [''];
        const folder = config.folder;
        const fieldsImage = config.imageFields;
        const downloadDir = saveImagesPath(folder);

        if (config.langs) {
            langs.push(...config.langs)
        }

        for (const lang of langs) {
            const path = savePath(folder, getFileNameByLang(config.fileName, lang));
            const previewPath = config.preview && savePath(folder, getFileNameByLang(config.preview, lang));

            const dataContent = await fetchAndProcessData(getUrl(config.url, false, lang), folder, downloadDir, fieldsImage);
            const previewData = config.preview && (await fetchAndProcessData(getUrl(config.url, true, lang), folder, downloadDir, fieldsImage));

            if (config.additionalProcess) {
                for (const process of config.additionalProcess) {
                    await process(dataContent, previewData, config, lang, isProduction);
                }
            }

            for (const f of config.removeFields) {
                for (const item of dataContent) {
                    item[f] && delete item[f];
                }
                if (previewData) {
                    for (const item of previewData) {
                        item[f] && delete item[f];
                    }
                }
            }

            isProduction && await writeJSONFile(path, dataContent);
            previewData && await writeJSONFile(previewPath, previewData);
        }
    }
}

main().catch((error) => console.error(error));
