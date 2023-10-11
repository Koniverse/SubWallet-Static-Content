import * as fs from "fs";
import axios from "axios";
import path from "path";
const MAP_CONTENT_TYPE = {
    'chain': 'chains',
    'category': 'categories',
    'dapp': 'dapps',
    'airdrop-campaign': 'airdrop-campaigns',
}
const urlParams = (contentType) => `https://content.subwallet.app/api/list/${contentType}`;
const savePath = (contentType) => `data/${contentType}/list.json`;
const saveImagesPath = (contentType) => `data/${contentType}/images`;
const urlImage = (folder, field, name) => `https://static-data.subwallet.app/${folder}/images/${field}/${name}`;

export async function downloadFile (url, downloadDir, forceFileName = null) {
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
    const key = process.argv[2];;
    const results = await fetch(urlParams(key)).then(res => res.json());
    const folder = MAP_CONTENT_TYPE[key] || key;
    const path = savePath(folder);
    const fieldsImage = ['icon', 'logo', 'backdrop_image'];
    const downloadDir = saveImagesPath(folder);
    const dataContent = await Promise.all(results.map(async item => {
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
}

main().catch((error) => console.error(error));
