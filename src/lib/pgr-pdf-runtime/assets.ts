import JSZip from "jszip";
import { readFile } from "fs/promises";

export type RuntimeVisualAssets = {
  coverBackground?: string;
  pageBackground?: string;
  brandLogo?: string;
};

const ASSET_PATHS = {
  coverBackground: "word/media/image3.png",
  pageBackground: "word/media/image1.png",
  brandLogo: "word/media/image2.png",
} as const;

function bufferToDataUrl(buffer: Buffer, mime = "image/png") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function readAssetAsDataUrl(zip: JSZip, filePath: string) {
  const file = zip.file(filePath);
  if (!file) return undefined;
  const content = await file.async("nodebuffer");
  return bufferToDataUrl(content);
}

export async function ensureRuntimeVisualAssetsFromTemplate(
  templatePath: string,
): Promise<RuntimeVisualAssets> {
  const templateBuffer = await readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const [coverBackground, pageBackground, brandLogo] = await Promise.all([
    readAssetAsDataUrl(zip, ASSET_PATHS.coverBackground),
    readAssetAsDataUrl(zip, ASSET_PATHS.pageBackground),
    readAssetAsDataUrl(zip, ASSET_PATHS.brandLogo),
  ]);

  return {
    coverBackground,
    pageBackground,
    brandLogo,
  };
}
