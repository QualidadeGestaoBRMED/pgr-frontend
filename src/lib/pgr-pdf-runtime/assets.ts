import JSZip from "jszip";
import { readFile } from "fs/promises";
import path from "path";

export type RuntimeVisualAssets = {
  coverBackground?: string;
  pageBackground?: string;
  brandLogo?: string;
  severityVertical?: string;
  gradationVertical?: string;
};

const ASSET_PATHS = {
  coverBackground: "word/media/image3.png",
  pageBackground: "word/media/image1.png",
  brandLogo: "word/media/image2.png",
} as const;

const LOCAL_ASSET_PATHS = {
  severityVertical: "severidade.png",
  gradationVertical: "gradacao.png",
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

async function readLocalAssetAsDataUrl(filePath: string) {
  try {
    const rootResolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const publicResolved = path.join(process.cwd(), "public", filePath);
    let resolved = rootResolved;
    try {
      await readFile(rootResolved);
    } catch {
      resolved = publicResolved;
    }
    const content = await readFile(resolved);
    return bufferToDataUrl(content);
  } catch {
    return undefined;
  }
}

export async function ensureRuntimeVisualAssetsFromTemplate(
  templatePath: string,
): Promise<RuntimeVisualAssets> {
  const templateBuffer = await readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const [coverBackground, pageBackground, brandLogo, severityVertical, gradationVertical] = await Promise.all([
    readAssetAsDataUrl(zip, ASSET_PATHS.coverBackground),
    readAssetAsDataUrl(zip, ASSET_PATHS.pageBackground),
    readAssetAsDataUrl(zip, ASSET_PATHS.brandLogo),
    readLocalAssetAsDataUrl(LOCAL_ASSET_PATHS.severityVertical),
    readLocalAssetAsDataUrl(LOCAL_ASSET_PATHS.gradationVertical),
  ]);

  return {
    coverBackground,
    pageBackground,
    brandLogo,
    severityVertical,
    gradationVertical,
  };
}
