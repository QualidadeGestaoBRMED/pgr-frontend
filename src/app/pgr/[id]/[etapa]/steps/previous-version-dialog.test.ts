import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PreviousVersionDialog,
  type PreviousVersionCandidate,
} from "./previous-version-dialog";

const render = (
  candidates: PreviousVersionCandidate[],
  selectedSourcePgrId: string
) =>
  renderToStaticMarkup(
    createElement(PreviousVersionDialog, {
      open: true,
      companyName: "",
      finalizedAt: "",
      attachmentsCount: 0,
      candidates,
      selectedSourcePgrId,
      onSelectSource: () => {},
      unavailableNotice: null,
      onDismiss: () => {},
      importing: false,
      error: null,
      onImport: () => {},
    })
  );

const importButton = (html: string) =>
  html.match(/<button[^>]*>(?:Importar dados|Importando\.\.\.)<\/button>/)?.[0] ??
  "";

const otherUnit: PreviousVersionCandidate = {
  sourcePgrId: "1417585929",
  companyName: "ROTA VERDE GOIÁS",
  importable: true,
  otherUnit: true,
};

describe("PreviousVersionDialog — outra unidade do mesmo CNPJ", () => {
  it("lists the other unit and keeps import disabled until confirmed", () => {
    const html = render([otherUnit], otherUnit.sourcePgrId);

    expect(html).toContain("Nenhum PGR anterior desta unidade");
    expect(html).toContain("Outras unidades do mesmo CNPJ");
    expect(html).toContain("é o mesmo estabelecimento deste PGR");
    expect(importButton(html)).toContain(`disabled=""`);
  });

  it("does not ask for confirmation when a same-unit source is selected", () => {
    const sameUnit: PreviousVersionCandidate = {
      sourcePgrId: "1383236295",
      companyName: "ROTA VERDE (ROTA VERDE)",
      importable: true,
    };
    const html = render([sameUnit, otherUnit], sameUnit.sourcePgrId);

    expect(html).toContain("Selecione o PGR anterior para importar");
    expect(html).not.toContain("é o mesmo estabelecimento deste PGR");
    expect(importButton(html)).not.toContain(`disabled=""`);
  });
});
