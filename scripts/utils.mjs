import fs from "fs";

export async function writeJSONFile(filePath, data) {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + filePath);
        }
    })
}