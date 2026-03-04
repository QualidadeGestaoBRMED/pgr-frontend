import JSZip from "jszip";
import path from "path";
import os from "os";
import { mkdir, readFile, writeFile } from "fs/promises";

const FONT_FILES = {
  workSans: {
    normal: "word/fonts/WorkSans-regular.ttf",
    bold: "word/fonts/WorkSans-bold.ttf",
    italics: "word/fonts/WorkSans-italic.ttf",
    bolditalics: "word/fonts/WorkSans-boldItalic.ttf",
  },
  workSansLight: {
    normal: "word/fonts/WorkSansLight-regular.ttf",
    bold: "word/fonts/WorkSansLight-bold.ttf",
    italics: "word/fonts/WorkSansLight-italic.ttf",
    bolditalics: "word/fonts/WorkSansLight-boldItalic.ttf",
  },
  workSansMedium: {
    normal: "word/fonts/WorkSansMedium-regular.ttf",
    bold: "word/fonts/WorkSansMedium-bold.ttf",
    italics: "word/fonts/WorkSansMedium-italic.ttf",
    bolditalics: "word/fonts/WorkSansMedium-boldItalic.ttf",
  },
  workSansSemiBold: {
    normal: "word/fonts/WorkSansSemiBold-regular.ttf",
    bold: "word/fonts/WorkSansSemiBold-bold.ttf",
    italics: "word/fonts/WorkSansSemiBold-italic.ttf",
    bolditalics: "word/fonts/WorkSansSemiBold-boldItalic.ttf",
  },
} as const;

type FontPaths = {
  workSans: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
  workSansLight: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
  workSansMedium: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
  workSansSemiBold: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
};

let cachedFontPathsPromise: Promise<FontPaths> | null = null;

export function getRuntimeFontDefinitions(fontPaths: FontPaths) {
  return {
    WorkSans: {
      normal: fontPaths.workSans.normal,
      bold: fontPaths.workSans.bold,
      italics: fontPaths.workSans.italics,
      bolditalics: fontPaths.workSans.bolditalics,
    },
    WorkSansLight: {
      normal: fontPaths.workSansLight.normal,
      bold: fontPaths.workSansLight.bold,
      italics: fontPaths.workSansLight.italics,
      bolditalics: fontPaths.workSansLight.bolditalics,
    },
    WorkSansMedium: {
      normal: fontPaths.workSansMedium.normal,
      bold: fontPaths.workSansMedium.bold,
      italics: fontPaths.workSansMedium.italics,
      bolditalics: fontPaths.workSansMedium.bolditalics,
    },
    WorkSansSemiBold: {
      normal: fontPaths.workSansSemiBold.normal,
      bold: fontPaths.workSansSemiBold.bold,
      italics: fontPaths.workSansSemiBold.italics,
      bolditalics: fontPaths.workSansSemiBold.bolditalics,
    },
  };
}

export async function ensureRuntimeFontsFromTemplate(templatePath: string): Promise<FontPaths> {
  if (cachedFontPathsPromise) return cachedFontPathsPromise;

  cachedFontPathsPromise = (async () => {
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    const targetDir = path.join(os.tmpdir(), "pgr-runtime-fonts");
    await mkdir(targetDir, { recursive: true });

    const ensureOne = async (zipPath: string, outputName: string) => {
      const target = path.join(targetDir, outputName);
      const file = zip.file(zipPath);
      if (!file) {
        throw new Error(`Fonte não encontrada no template: ${zipPath}`);
      }
      const content = await file.async("nodebuffer");
      await writeFile(target, content);
      return target;
    };

    return {
      workSans: {
        normal: await ensureOne(FONT_FILES.workSans.normal, "WorkSans-regular.ttf"),
        bold: await ensureOne(FONT_FILES.workSans.bold, "WorkSans-bold.ttf"),
        italics: await ensureOne(FONT_FILES.workSans.italics, "WorkSans-italic.ttf"),
        bolditalics: await ensureOne(FONT_FILES.workSans.bolditalics, "WorkSans-boldItalic.ttf"),
      },
      workSansLight: {
        normal: await ensureOne(FONT_FILES.workSansLight.normal, "WorkSansLight-regular.ttf"),
        bold: await ensureOne(FONT_FILES.workSansLight.bold, "WorkSansLight-bold.ttf"),
        italics: await ensureOne(FONT_FILES.workSansLight.italics, "WorkSansLight-italic.ttf"),
        bolditalics: await ensureOne(
          FONT_FILES.workSansLight.bolditalics,
          "WorkSansLight-boldItalic.ttf",
        ),
      },
      workSansMedium: {
        normal: await ensureOne(FONT_FILES.workSansMedium.normal, "WorkSansMedium-regular.ttf"),
        bold: await ensureOne(FONT_FILES.workSansMedium.bold, "WorkSansMedium-bold.ttf"),
        italics: await ensureOne(FONT_FILES.workSansMedium.italics, "WorkSansMedium-italic.ttf"),
        bolditalics: await ensureOne(
          FONT_FILES.workSansMedium.bolditalics,
          "WorkSansMedium-boldItalic.ttf",
        ),
      },
      workSansSemiBold: {
        normal: await ensureOne(
          FONT_FILES.workSansSemiBold.normal,
          "WorkSansSemiBold-regular.ttf",
        ),
        bold: await ensureOne(FONT_FILES.workSansSemiBold.bold, "WorkSansSemiBold-bold.ttf"),
        italics: await ensureOne(
          FONT_FILES.workSansSemiBold.italics,
          "WorkSansSemiBold-italic.ttf",
        ),
        bolditalics: await ensureOne(
          FONT_FILES.workSansSemiBold.bolditalics,
          "WorkSansSemiBold-boldItalic.ttf",
        ),
      },
    };
  })();

  return cachedFontPathsPromise;
}
