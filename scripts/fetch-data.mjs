import * as fs from "fs";
import axios from "axios";
import path from "path";

const STRAPI_URL = 'https://content.subwallet.app';
const RESOURCE_URL = 'https://static-data.subwallet.app';

const cacheConfigs = [
    {
        url: `${STRAPI_URL}/api/list/chain`,
        folder: 'chains',
        fileName: 'list.json',
        imageFields: ['icon'],
        removeFields: ['id']
    },
    {
        url: `${STRAPI_URL}/api/list/chain?preview=true`,
        folder: 'chains',
        fileName: 'preview.json',
        imageFields: ['icon'],
        removeFields: ['id']
    },
    {
        url: `${STRAPI_URL}/api/list/dapp`,
        folder: 'dapps',
        fileName: 'list.json',
        imageFields: ['icon'],
        removeFields: []
    },
    {
        url: `${STRAPI_URL}/api/list/category`,
        folder: 'categories',
        fileName: 'list.json',
        imageFields: [],
        removeFields: ['id']
    },
    {
        url: `${STRAPI_URL}/api/list/airdrop-campaign`,
        folder: 'airdrop-campaigns',
        fileName: 'list.json',
        imageFields: ['logo', 'backdrop_image'],
        removeFields: []
    },
    {
        url: `${STRAPI_URL}/api/list/crowdloan-fund`,
        folder: 'crowdloan-funds',
        fileName: 'list.json',
        imageFields: [],
        removeFields: ['id']
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
        writer.on('error', reject);
    });
}

async function writeJSONFile(filePath, data) {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + filePath);
        }
    })
}

const main = async () => {
    for (const config of cacheConfigs) {
        console.log('Caching data with config', config)
        const results = await axios.get(config.url);
        if (!results.data) return;
        const folder = config.folder;
        const path = savePath(folder, config.fileName);
        const fieldsImage = config.imageFields;
        const downloadDir = saveImagesPath(folder);
        const dataContent = await Promise.all(results.data.map(async item => {
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
        await writeJSONFile(path, dataContent);

        for (const f of config.removeFields) {
            dataContent[f] && delete dataContent[f];
        }
    }
}

main().catch((error) => console.error(error));
