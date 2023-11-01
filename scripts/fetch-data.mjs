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
        additionalProcess: [{
            fileName: 'logo_map.json',
            processor: (data, preview_data) => {
                return Object.fromEntries(preview_data.map((c) => ([c.slug, c.icon])));
            },
        }]
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
    }
]

const savePath = (folder, fileName) => `data/${folder}/${fileName || 'list.json'}`;
const saveImagesPath = (folder) => `data/${folder}/images`;
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

const fetchAndProcessData = async (url, folder, downloadDir, fieldsImage) => {
    const results = await axios.get(url);

    if (!results.data) return;

    return await Promise.all(results.data.map(async item => {
        const dataImages = {};
        for (const field of fieldsImage) {
            const dataField = item[field];
            if (dataField) {
                const folderFieldImage = `${downloadDir}/${field}`;
                const newFileName = await downloadFile(dataField, folderFieldImage);
                dataImages[field] = urlImage(folder, field, newFileName);
            }
        }
        return {...item, ...dataImages};
    }));
}


const main = async () => {
    // Filter config by folder
    const environment = process.argv[2];
    const isProduction = environment === 'production';
    const folder = process.argv[3];
    const configs = folder ? cacheConfigs.filter((c) => c.folder === folder) : cacheConfigs;
    for (const config of configs) {
        console.log('Caching data with config', config)

        const folder = config.folder;
        const path = savePath(folder, config.fileName);
        const previewPath = config.preview && savePath(folder, config.preview);
        const fieldsImage = config.imageFields;
        const downloadDir = saveImagesPath(folder);

        const dataContent = await fetchAndProcessData(config.url, folder, downloadDir, fieldsImage);
        const previewData = config.preview && (await fetchAndProcessData(`${config.url}?preview=true`, folder, downloadDir, fieldsImage));

        if (config.additionalProcess) {
            for (const process of config.additionalProcess) {
                const data = process.processor(dataContent, previewData);
                await writeJSONFile(savePath(folder, process.fileName), data);
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

main().catch((error) => console.error(error));
