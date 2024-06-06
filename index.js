import express from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let profilePicWithFlagBuffer = null;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.post("/profile-pic", upload.single('pic1'), async (req, res) => {
    try {
        const pic1 = req.file.buffer;
        const pic2Path = path.join(__dirname, "public/pls.png");

        const pic2 = await sharp(pic2Path).toBuffer();
        const { width: width2, height: height2 } = await sharp(pic2).metadata();

        const newWidth = Math.floor(width2 * 0.85);
        const newHeight = Math.floor(height2 * 0.85);

        const resizedPic1 = await sharp(pic1)
            .resize(newWidth, newHeight)
            .toBuffer();

        const mask = Buffer.from(
            `<svg width="${newWidth}" height="${newHeight}"><circle cx="${newWidth / 2}" cy="${newHeight / 2}" r="${Math.min(newWidth, newHeight) / 2}" /></svg>`
        );

        const circlePic1 = await sharp(resizedPic1)
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();

        profilePicWithFlagBuffer = await sharp(pic2)
            .composite([{ input: circlePic1, top: Math.floor((height2 - newHeight) / 2), left: Math.floor((width2 - newWidth) / 2), blend: "over" }])
            .toBuffer();

        res.redirect("/result");
    } catch (error) {
        console.error(error);
        res.status(500).send("حدث خطأ ما!");
    }
});

app.get("/result", (req, res) => {
    res.render('result', { imageUrl: '/output.png' });
});

app.get("/output.png", (req, res) => {
    if (profilePicWithFlagBuffer) {
        res.setHeader("Content-Type", "image/png");
        res.send(profilePicWithFlagBuffer);
    } else {
        res.status(404).send("لم يتم إنشاء صورة الملف الشخصي بعد!");
    }
});

app.get("/download", (req, res) => {
    if (profilePicWithFlagBuffer) {
        const fileName = `profile_pic_with_flag_${uuidv4()}.png`; 
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.setHeader("Content-Type", "image/png");
        res.send(profilePicWithFlagBuffer);
    } else {
        res.status(404).send("لم يتم إنشاء صورة الملف الشخصي بعد!");
    }
});

app.get("/delete-image", (req, res) => {
    profilePicWithFlagBuffer = null;
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
