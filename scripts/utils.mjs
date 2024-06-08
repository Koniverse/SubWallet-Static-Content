import fs from "fs";
import path from "path";

export async function writeJSONFile(filePath, data) {
    const dirname = path.dirname(filePath);
    fs.mkdirSync(dirname, {recursive: true})
    fs.writeFile(filePath, JSON.stringify(data, null, 2), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + filePath);
        }
    })
}