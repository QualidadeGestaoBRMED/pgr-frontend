import { ArrowLeft, ArrowRight, FileSpreadsheet, MinusCircle, Search } from "lucide-react";
import { SearchableSelect } from "./searchable-select";

type DescricaoStepProps = {
  ctx: any;
};

export function DescricaoStep({ ctx }: DescricaoStepProps) {
  const {
    currentGheName,
    lastGheNotice,
    searchTerm,
    setSearchTerm,
    availableCountLabel,
    remainingCount,
    describedGheCount,
    setIsGheModalOpen,
    setIsGheListView,
    isGheListView,
    importExcelInputRef,
    handleDescricaoExcelChange,
    isImportingExcel,
    excelImportFeedback,
    groupedFunctions,
    selectedLeftIds,
    handleSelectionStart,
    leftListRef,
    getSelectionStyle,
    dragOverZone,
    handleDragOver,
    handleDropToLeft,
    handleDragLeave,
    handleToggleLeftSelection,
    handleDragStartLeft,
    handleAddSelected,
    handleRemoveSelected,
    handleCreateNextGhe,
    currentItems,
    functionMap,
    selectedRightIds,
    handleDropToRight,
    rightListRef,
    handleToggleRightSelection,
    handleDragStartRight,
    miniInputClass,
    handleFuncionarioChange,
    handleRemoveSingle,
    isGheModalOpen,
    gheFilterId,
    setGheFilterId,
    gheGroups,
    handleSelectGhe,
    gheSearch,
    setGheSearch,
    inputInlineClass,
    normalizedGheSearch,
    filteredAllFunctions,
    filteredGheGroupsForList,
    truncatePreview,
    functionAssignments,
    assignGheOptions,
    selectBaseClass,
    handleAssignFunction,
    isInfoModalOpen,
    setInfoModalError,
    setIsInfoModalOpen,
    textareaBaseClass,
    currentGhe,
    handleInfoChange,
    infoModalError,
    handleConfirmInfoModal,
    infoModalMode,
  } = ctx;

  return (
    <>
          <section className="px-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
                Descrição do GHE
              </h1>
              <div className="group relative">
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground"
                  aria-label="Ajuda sobre o fluxo do GHE"
                >
                  ?
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-[260px] -translate-x-1/2 rounded-[10px] bg-popover p-3 text-[12px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)] opacity-0 transition group-hover:opacity-100">
                  Dica rápida: Associar as funções ao GHE e,
                  depois, preencher processo, observações e ambiente. Atenção à
                  ordem pois é um processo repetitivo e pode gerar erros.
                </div>
              </div>
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Descreva o processo produtivo, ambiente e funções do GHE
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[20px] font-semibold text-foreground">
                  {currentGheName}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Você está montando e descrevendo este GHE.
                </p>
              </div>
            </div>
            {lastGheNotice ? (
              <div className="mt-3 rounded-[10px] border border-border/70 bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                {lastGheNotice.from} finalizado. Agora você está no{" "}
                <span className="font-semibold text-foreground">
                  {lastGheNotice.to}
                </span>
                .
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 px-2">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[16px] font-medium text-foreground">
                    Funções do GHE
                  </h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                    {currentGheName}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {currentItems.length} funções associadas
                  {remainingCount
                    ? ` · ${remainingCount} funções restantes`
                    : " · Todas as funções já estão associadas"}
                  {` · ${describedGheCount}/${gheGroups.length} GHEs descritos`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsGheModalOpen(true)}
                  className="btn-primary px-4"
                >
                  Ver GHEs
                </button>
                <button
                  type="button"
                  onClick={() => importExcelInputRef.current?.click()}
                  disabled={isImportingExcel}
                  className={isImportingExcel ? "btn-disabled px-4" : "btn-primary px-4"}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {isImportingExcel ? "Importando..." : "Importar do Excel"}
                </button>
                <input
                  ref={importExcelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleDescricaoExcelChange}
                />
              </div>
            </div>
            {excelImportFeedback ? (
              <p
                className={`mt-3 text-[12px] ${
                  excelImportFeedback.type === "error"
                    ? "text-danger"
                    : "text-muted-foreground"
                }`}
              >
                {excelImportFeedback.message}
              </p>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
              <div
                ref={leftListRef}
                onPointerDown={(event) => handleSelectionStart(event, "left")}
                onDragOver={(event) => handleDragOver(event, "left")}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToLeft}
                className={`relative rounded-[14px] border bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${
                  dragOverZone === "left"
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border/70"
                } select-none`}
              >
                {getSelectionStyle("left") ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[8px] border border-primary/40 bg-primary/10"
                    style={getSelectionStyle("left") ?? undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Lista geral de funções
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Selecione ou arraste para o GHE atual
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[12px] font-semibold text-foreground/70">
                    {availableCountLabel}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar por setor ou função"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  <p className="text-[11px] text-muted-foreground">
                    Arraste uma ou várias funções selecionadas para o GHE.
                  </p>
                  {groupedFunctions.length ? (
                    groupedFunctions.map((group) => (
                      <div key={group.setor} className="space-y-3">
                        <h3 className="text-[16px] font-semibold text-foreground">
                          {group.setor}
                        </h3>
                        <div className="space-y-2 text-[13px] text-foreground/80">
                          {group.items.map((funcao) => (
                            <label
                              key={funcao.id}
                              data-select-item
                              data-left-id={funcao.id}
                              draggable
                              onDragStart={(event) =>
                                handleDragStartLeft(event, funcao.id)
                              }
                              onDragEnd={handleDragLeave}
                              className="flex cursor-grab items-center gap-2 rounded-[8px] px-2 py-1 transition hover:bg-muted/70"
                            >
                              <input
                                type="checkbox"
                                checked={selectedLeftIds.includes(funcao.id)}
                                onChange={() =>
                                  handleToggleLeftSelection(funcao.id)
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span
                                className="min-w-0 flex-1 break-words"
                                title={`${funcao.funcao} - ${funcao.descricao}`}
                              >
                                {funcao.funcao} - {truncatePreview(funcao.descricao, 90)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      Nenhuma função encontrada.
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={!selectedLeftIds.length}
                    className={
                      selectedLeftIds.length
                        ? "btn-primary px-4"
                        : "btn-disabled px-4"
                    }
                  >
                    Adicionar selecionadas
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 self-center">
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={!selectedLeftIds.length}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    selectedLeftIds.length
                      ? "border-primary text-primary hover:bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  disabled={!selectedRightIds.length}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    selectedRightIds.length
                      ? "border-primary text-primary hover:bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              <div
                ref={rightListRef}
                onPointerDown={(event) => handleSelectionStart(event, "right")}
                onDragOver={(event) => handleDragOver(event, "right")}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToRight}
                className={`relative rounded-[14px] border bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${
                  dragOverZone === "right"
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border/70"
                } select-none`}
              >
                {getSelectionStyle("right") ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[8px] border border-primary/40 bg-primary/10"
                    style={getSelectionStyle("right") ?? undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Funções no {currentGheName}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Arraste para devolver à lista geral
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                    {currentItems.length} associadas
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] gap-4 text-[12px] font-semibold text-muted-foreground">
                  <span />
                  <span>Setor</span>
                  <span>Função</span>
                  <span>Descrição de atividades</span>
                  <span>Nº de funcionários</span>
                  <span />
                </div>
                <div className="mt-3 space-y-2">
                  {currentItems.length ? (
                    currentItems.map((item) => {
                      const data = functionMap.get(item.functionId);
                      if (!data) return null;
                      return (
                      <div
                        key={item.functionId}
                        data-select-item
                        data-right-id={item.functionId}
                        draggable
                        onDragStart={(event) =>
                          handleDragStartRight(event, item.functionId)
                        }
                        onDragEnd={handleDragLeave}
                        className="grid cursor-grab grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] items-center gap-4 rounded-[10px] border border-border/60 px-3 py-3 text-[13px] text-foreground/80 transition hover:bg-muted/70"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRightIds.includes(item.functionId)}
                          onChange={() =>
                            handleToggleRightSelection(item.functionId)
                          }
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span
                          className="min-w-0 truncate font-semibold text-foreground"
                          title={data.setor}
                        >
                          {data.setor}
                        </span>
                        <span
                          className="min-w-0 truncate font-medium text-foreground/90"
                          title={data.funcao}
                        >
                          {data.funcao}
                        </span>
                        <span
                          className="min-w-0 truncate text-muted-foreground"
                          title={data.descricao}
                        >
                          {truncatePreview(data.descricao, 90)}
                        </span>
                        <input
                          className={miniInputClass}
                          type="number"
                          min={0}
                          step={1}
                          value={item.funcionarios || "0"}
                          data-funcionarios
                          data-func-id={item.functionId}
                          onChange={(event) =>
                            handleFuncionarioChange(
                              item.functionId,
                              event.target.value
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSingle(item.functionId)}
                          className="text-muted-foreground transition hover:text-primary"
                          title="Remover"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[13px] text-muted-foreground">
                      Nenhuma função adicionada ao GHE.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {isGheModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 py-6">
                <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-foreground">
                        GHEs construídos
                      </h3>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Visualize e edite as funções associadas a cada GHE
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGheModalOpen(false)}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
                    <div className="min-h-0 space-y-4 overflow-auto pr-2">
                      <button
                        type="button"
                        onClick={() => setGheFilterId("all")}
                        className={`w-full rounded-[12px] border px-4 py-4 text-left ${
                          gheFilterId === "all"
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/70 bg-background/40"
                        }`}
                      >
                        <p className="text-[14px] font-semibold text-foreground">
                          Todos os GHEs
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {gheGroups.reduce(
                            (total, ghe) => total + ghe.items.length,
                            0
                          )}{" "}
                          funções associadas
                        </p>
                      </button>
                      {gheGroups.map((ghe) => (
                        <div
                          key={ghe.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setGheFilterId(ghe.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setGheFilterId(ghe.id);
                            }
                          }}
                          className={`rounded-[12px] border px-4 py-4 ${
                            gheFilterId === ghe.id
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/70 bg-background/40"
                          } cursor-pointer`}
                        >
                          <div className="w-full text-left">
                            <p className="text-[14px] font-semibold text-foreground">
                              {ghe.name}
                            </p>
                            <p className="text-[12px] text-muted-foreground">
                              {ghe.items.length} funções associadas
                            </p>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectGhe(ghe.id);
                              }}
                              className="btn-outline px-3 py-1 text-[12px]"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-col rounded-[12px] border border-border/70 bg-background/40 px-4 py-4">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={gheSearch}
                          onChange={(event) => setGheSearch(event.target.value)}
                          className={`${inputInlineClass} pl-10`}
                          placeholder="Buscar por setor ou função"
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[12px] text-muted-foreground">
                          {gheFilterId === "all"
                            ? "Visualizando todas as funções"
                            : `Filtro: ${gheGroups.find(
                                (ghe) => ghe.id === gheFilterId
                              )?.name ?? "GHE"}`}
                          {normalizedGheSearch
                            ? ` · ${filteredAllFunctions.length} resultados`
                            : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsGheListView((prev) => !prev)}
                          className="btn-outline px-3 py-1 text-[12px]"
                        >
                          {isGheListView
                            ? "Voltar para edição"
                            : "Visualizar em lista"}
                        </button>
                      </div>
                    {isGheListView ? (
                      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-auto pr-2">
                        {filteredGheGroupsForList.length ? (
                          filteredGheGroupsForList.map((ghe) => (
                          <div
                            key={ghe.id}
                            className="rounded-[10px] border border-border/60 bg-card px-3 py-3"
                          >
                            <p className="text-[13px] font-semibold text-foreground">
                              {ghe.name}
                            </p>
                            {ghe.items.length ? (
                              <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                                {ghe.items.map((item) => {
                                  const data = functionMap.get(item.functionId);
                                  if (!data) return null;
                                  return (
                                    <li key={item.functionId}>
                                      {data.funcao} · {data.setor}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="mt-2 text-[12px] text-muted-foreground">
                                Nenhuma função associada.
                              </p>
                            )}
                          </div>
                          ))
                        ) : (
                          <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                            Nenhum resultado para o filtro aplicado.
                          </div>
                        )}
                      </div>
                    ) : (
                        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-2">
                          {filteredAllFunctions.map((funcao) => {
                            const assignedGheId = functionAssignments.get(
                              funcao.id
                            );
                            const assignedGhe = gheGroups.find(
                              (ghe) => ghe.id === assignedGheId
                            );
                            return (
                              <div
                                key={funcao.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-border/60 bg-card px-3 py-3"
                              >
                                <div>
                                  <p className="text-[13px] font-semibold text-foreground">
                                    {funcao.funcao}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {funcao.setor} · {truncatePreview(funcao.descricao, 110)}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {assignedGhe
                                      ? `Atrelado ao ${assignedGhe.name}`
                                      : "Sem GHE"}
                                  </p>
                                </div>
                                <SearchableSelect
                                  value={assignedGheId ?? "none"}
                                  onChange={(value) =>
                                    handleAssignFunction(funcao.id, value)
                                  }
                                  options={assignGheOptions}
                                  buttonClassName={`${selectBaseClass} w-[170px]`}
                                  searchPlaceholder="Filtrar GHE"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isInfoModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[18px] font-semibold text-foreground">
                          Informações do Processo
                        </h3>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                          {currentGheName}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Preencha as informações do {currentGheName} que você acabou de montar
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoModalError("");
                        setIsInfoModalOpen(false);
                      }}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Descrição Sucinta do Processo Produtivo
                      </label>
                      <textarea
                        className={textareaBaseClass}
                        value={currentGhe?.info.processo ?? ""}
                        onChange={(event) =>
                          handleInfoChange("processo", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Observações do GHE:
                      </label>
                      <textarea
                        className={textareaBaseClass}
                        value={currentGhe?.info.observacoes ?? ""}
                        onChange={(event) =>
                          handleInfoChange("observacoes", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Descrição do Ambiente do GHE:
                      </label>
                      <textarea
                        className={textareaBaseClass}
                        value={currentGhe?.info.ambiente ?? ""}
                        onChange={(event) =>
                          handleInfoChange("ambiente", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    {infoModalError ? (
                      <p className="mr-auto text-[12px] text-danger">{infoModalError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setInfoModalError("");
                        setIsInfoModalOpen(false);
                      }}
                      className="btn-outline px-4"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmInfoModal}
                      className="btn-primary px-5"
                    >
                      {infoModalMode === "advance"
                        ? "Salvar e avançar"
                        : infoModalMode === "next-existing"
                          ? "Salvar e ir para próximo GHE"
                          : "Salvar e continuar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
    </>
  );
}
