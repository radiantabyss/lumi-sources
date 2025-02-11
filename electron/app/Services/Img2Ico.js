import fs from 'fs-extra';
import Jimp from 'jimp';

let self = {
    async run(file) {
        if ( typeof file == 'undefined' ) {
            return `${STATIC_PATH}/images/icon.ico`;
        }

        //check if it's already ico
        if ( file.match(/\.ico$/) ) {
            return file;
        }

        //check if it was already converted to ico
        if ( await fs.exists(file.replace(/\.(?:png|jpg)$/, '.ico')) ) {
            return file.replace(/\.(?:png|jpg)$/, '.ico');
        }

        try {
            //convert jpg to png
            if ( file.match(/\.jpg$/) ) {
                file = await self.jpg2Png(file);
            }

            //convert png to ico
            await self.png2Ico(file);
        }
        catch(e) {
            return `${STATIC_PATH}/images/icon.ico`;
        }

        return file.replace(/\.(?:png|jpg)$/, '.ico');
    },

    async jpg2Png(file) {
        let image = await Jimp.read(file);
        let jpg_file = file.replace(/\.jpg/i, '.png');
        image.write(jpg_file);
        fs.remove(file);

        return jpg_file;
    },

    async png2Ico(file) {
        let image = await Jimp.read(file);

		if ( image.bitmap.width !== 256 ) {
			image.resize(256, 256, Jimp.RESIZE_BICUBIC);
		}

        const sizes = [48, 32, 16];
		const image_variants = sizes.map(size =>
			image.clone().resize(size, size, Jimp.RESIZE_BICUBIC)
		);

        let buffer = self._imagesToIco(image_variants.concat(image));
		await fs.writeFile(file.replace(/\.png/, '.ico'), buffer);
    },

    _imagesToIco(images) {
    	const header = self._getHeader(images.length);
    	const headerAndIconDir = [header];
    	const imageDataArr = [];

    	let len = header.length;
    	let offset = header.length + 16 * images.length;

    	images.forEach(img => {
    		const dir = self._getDir(img, offset);
    		const bmpInfoHeader = self._getBmpInfoHeader(img);
    		const dib = self._getDib(img);

    		headerAndIconDir.push(dir);
    		imageDataArr.push(bmpInfoHeader, dib);

    		len += dir.length + bmpInfoHeader.length + dib.length;
    		offset += bmpInfoHeader.length + dib.length;
    	});

    	return Buffer.concat(headerAndIconDir.concat(imageDataArr), len);
    },

    _getHeader(numOfImages) {
    	const buf = Buffer.alloc(6);

    	buf.writeUInt16LE(0, 0); // Reserved. Must always be 0.
    	buf.writeUInt16LE(1, 2); // Specifies image type: 1 for icon (.ICO) image
    	buf.writeUInt16LE(numOfImages, 4); // Specifies number of images in the file.

    	return buf;
    },

    _getDir(img, offset) {
    	const buf = Buffer.alloc(16);
    	const bitmap = img.bitmap;
    	const size = bitmap.data.length + 40;
    	const width = bitmap.width >= 256 ? 0 : bitmap.width;
    	const height = width;
    	const bpp = 32;

    	buf.writeUInt8(width, 0); // Specifies image width in pixels.
    	buf.writeUInt8(height, 1); // Specifies image height in pixels.
    	buf.writeUInt8(0, 2); // Should be 0 if the image does not use a color palette.
    	buf.writeUInt8(0, 3); // Reserved. Should be 0.
    	buf.writeUInt16LE(1, 4); // Specifies color planes. Should be 0 or 1.
    	buf.writeUInt16LE(bpp, 6); // Specifies bits per pixel.
    	buf.writeUInt32LE(size, 8); // Specifies the size of the image's data in bytes
    	buf.writeUInt32LE(offset, 12); // Specifies the offset of BMP or PNG data from the beginning of the ICO/CUR file

    	return buf;
    },

    _getBmpInfoHeader(img) {
    	const buf = Buffer.alloc(40);
    	const bitmap = img.bitmap;
    	const width = bitmap.width;
    	// https://en.wikipedia.org/wiki/ICO_(file_format)
    	// ...Even if the AND mask is not supplied,
    	// if the image is in Windows BMP format,
    	// the BMP header must still specify a doubled height.
    	const height = width * 2;
    	const bpp = 32;

    	buf.writeUInt32LE(40, 0); // The size of this header (40 bytes)
    	buf.writeInt32LE(width, 4); // The bitmap width in pixels (signed integer)
    	buf.writeInt32LE(height, 8); // The bitmap height in pixels (signed integer)
    	buf.writeUInt16LE(1, 12); // The number of color planes (must be 1)
    	buf.writeUInt16LE(bpp, 14); // The number of bits per pixel
    	buf.writeUInt32LE(0, 16); // The compression method being used.
    	buf.writeUInt32LE(0, 20); // The image size.
    	buf.writeInt32LE(0, 24); // The horizontal resolution of the image. (signed integer)
    	buf.writeInt32LE(0, 28); // The vertical resolution of the image. (signed integer)
    	buf.writeUInt32LE(0, 32); // The number of colors in the color palette, or 0 to default to 2n
    	buf.writeUInt32LE(0, 36); // The number of important colors used, or 0 when every color is important; generally ignored.

    	return buf;
    },

    _getDib(img) {
    	const bitmap = img.bitmap;
    	const size = bitmap.data.length;
    	const width = bitmap.width;
    	const height = width;
    	const andMapRow = self._getRowStride(width);
    	const andMapSize = andMapRow * height;
    	const buf = Buffer.alloc(size + andMapSize);
    	// xor map
    	for (let y = 0; y < height; y++) {
    		for (let x = 0; x < width; x++) {
    			const pxColor = img.getPixelColor(x, y);

    			const r = (pxColor >> 24) & 255;
    			const g = (pxColor >> 16) & 255;
    			const b = (pxColor >> 8) & 255;
    			const a = pxColor & 255;
    			const newColor = b | (g << 8) | (r << 16) | (a << 24);

    			const pos = ((height - y - 1) * width + x) * 4;

    			buf.writeInt32LE(newColor, pos);
    		}
    	}

    	// and map. It's padded out to 32 bits per line
    	for (let y = 0; y < height; y++) {
    		for (let x = 0; x < width; x++) {
    			const pxColor = img.getPixelColor(x, y);
    			// TODO make threshhold configurable
    			const alpha = (pxColor & 255) > 0 ? 0 : 1;
    			const bitNum = (height - y - 1) * width + x;
    			// width per line in multiples of 32 bits
    			const width32 =
    				width % 32 === 0 ? Math.floor(width / 32) : Math.floor(width / 32) + 1;

    			const line = Math.floor(bitNum / width);
    			const offset = Math.floor(bitNum % width);
    			const bitVal = alpha & 0x00000001;

    			const pos = size + line * width32 * 4 + Math.floor(offset / 8);
    			const newVal = buf.readUInt8(pos) | (bitVal << (7 - (offset % 8)));
    			buf.writeUInt8(newVal, pos);
    		}
    	}

    	return buf;
    },

    _getRowStride(width) {
    	if ( width % 32 === 0 ) {
    		return width / 8;
    	}
        else {
    		return 4 * (Math.floor(width / 32) + 1);
    	}
    },
};

export default self;
