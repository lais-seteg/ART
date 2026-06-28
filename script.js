// ========== CONFIGURAÇÃO SUPABASE ==========
const SUPABASE_URL = 'https://cbpthkoznhmlmbuynksn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PG5hleeJ53FnP1S65_0WFQ_fUkAePiV';

const CLOCKIFY_API_KEY = 'ODUwOThjOTUtYmJlNS00Nzg5LWI3NmYtYzRjYjZlZGE3NDIw';
const CLOCKIFY_BASE_URL = 'https://api.clockify.me/api/v1';
let projetosClockify = [];

let _sb = null;
try {
  const _supabaseCDN = window.supabase || window.supabaseJs;
  if (_supabaseCDN && _supabaseCDN.createClient) {
    _sb = _supabaseCDN.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    window.supabaseClient = _sb;
  }
} catch (e) {
  console.error('Falha ao inicializar Supabase:', e);
}

// ========== ARMAZENAMENTO LOCAL (FALLBACK OFFLINE) ==========
const LS = {
  CACHE: 'seteg_sol_cache',
  HIST: 'seteg_hist_cache',
  QUEUE: 'seteg_sync_queue'
};

function lsGet(key, fallback) {
  if (fallback === undefined) fallback = null;
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e) { return fallback; }
}

function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

function isNetworkError(e) {
  if (!e) return false;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('load failed') ||
    msg.includes('networkerror') || msg.includes('network request failed') ||
    (e instanceof TypeError && msg.includes('fetch'));
}

function enfileirarSync(op) {
  const q = lsGet(LS.QUEUE, []);
  q.push({ ...op, ts: Date.now() });
  lsSet(LS.QUEUE, q);
}


// ========== CONFIGURAÇÃO ==========
const CONFIG = {
  MAX_ATIVIDADES: 3,
  DEBOUNCE_MS: 300,
  TIMEZONE: 'America/Sao_Paulo'
};

// ========== ESTADO ==========
const AppState = {
  usuarioAtual: null,
  solicitacoes: [],
  historico: [],
  solicitacaoEditando: null,
  atividadeCREAIndex: 0,
  tipoLoginAtual: null,
  searchDebounceTimer: null,
  paginaAtual: 1,
  itensPorPagina: 10,
  totalPaginas: 1
};

// ========== CACHE DOM ==========
const DOM = {
  formContainer: null,
  artForm: null,
  artTableBody: null,
  tableEmpty: null,
  searchInput: null,
  toastContainer: null,
  tipoSolicitacao: null,
  formCREA: null,
  formCRBio: null,
  btnAddAtividadeCREA: null,
  atividadesCREAContainer: null,
  kpis: {},
  filterPills: [],
  filterConselho: null,
  filterSetor: null, // removido — setor não existe mais
  loginModal: null,
  modalOverlay: null,
  statusModalOverlay: null,
  editModalOverlay: null,
  ajusteModalOverlay: null,
  baixaModalOverlay: null,
  paginationContainer: null,
  paginationInfo: null,
  paginationNumbers: null,
  btnFirst: null,
  btnPrev: null,
  btnNext: null,
  btnLast: null,
  perPageSelect: null,
  // ✅ NOVO: Elementos de notificação
  notificacoesFinanceiro: null,
  badgePagamentosPendentes: null,
  listaPagamentosPendentes: null
};

// ========== CONSTANTES ==========
const NIVEIS_ATIVIDADE = [
  "ASSESSORIA", "ASSESSORIA EM BIM", "ASSISTÊNCIA", "CONCEPÇÃO", "CONCEPÇÃO EM BIM",
  "CONDUÇÃO DE EQUIPE", "CONDUÇÃO DE SERVIÇO TÉCNICO", "CONSULTORIA", "CONSULTORIA EM BIM",
  "COORDENAÇÃO", "DIREÇÃO DE OBRA", "DIREÇÃO DE OBRA EM BIM", "DIREÇÃO DE SERVIÇO TÉCNICO",
  "ELABORAÇÃO", "ELABORAÇÃO EM BIM", "EXECUÇÃO", "EXECUÇÃO EM BIM", "FISCALIZAÇÃO",
  "FISCALIZAÇÃO EM BIM", "GESTÃO", "GESTÃO EM BIM", "ORIENTAÇÃO", "SUPERVISÃO"
];

const ICONS = {
  ver: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  atribuir: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
  encaminhar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  status: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  excluir: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  ajuste: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  baixa: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  finalizar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  confirmarBaixa: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>`,
  pagar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  assinar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><polyline points="17 8 20 11"/></svg>`,
  enviarRascunho: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  aprovarRascunho: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  reprovarRascunho: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
};

const ATIVIDADES_PROFISSIONAIS = [
  "AFERIÇÃO", "ANÁLISE", "ANTE-PROJETO", "ANTEPROJETO ARQUITETÔNICO", "ARBITRAGEM",
  "ASSESSORIA", "ASSESSORIA EM BIM", "ASSISTÊNCIA", "AUDITORIA", "AVALIAÇÃO",
  "CALIBRAÇÃO", "COLETA DE DADOS", "COMO CONSTRUÍDO - 'AS BUILT'", "CONCEPÇÃO",
  "CONCEPÇÃO EM BIM", "CONSULTORIA", "CONSULTORIA EM BIM", "CONTROLE DE QUALIDADE",
  "CONDUÇÃO DE EQUIPE", "CONDUÇÃO DE SERVIÇO TÉCNICO", "COORDENAÇÃO", "DIREÇÃO",
  "DIREÇÃO DE OBRA", "DIREÇÃO DE OBRA EM BIM", "DIREÇÃO DE SERVIÇO TÉCNICO",
  "ELABORAÇÃO", "ELABORAÇÃO EM BIM", "ENSAIO", "ESPECIFICAÇÃO", "ESTUDO",
  "EXECUÇÃO", "EXECUÇÃO EM BIM", "FISCALIZAÇÃO", "FISCALIZAÇÃO EM BIM",
  "GERENCIAMENTO", "GESTÃO", "GESTÃO EM BIM", "INSPEÇÃO", "INSTALAÇÃO",
  "LAUDO TÉCNICO", "MANUTENÇÃO", "MONITORAMENTO", "OPERAÇÃO", "ORIENTAÇÃO",
  "PERÍCIA", "PLANEJAMENTO", "PRODUÇÃO", "PROJETO", "SUPERVISÃO", "TREINAMENTO", "VISTORIA"
];

// ✅ NOVO: Status permitidos por perfil
const STATUS_POR_PERFIL = {
  admin: ['Na fila', 'Processando', 'Rascunho Pendente', 'Ajuste Pendente', 'Pagamento Programado', 'Pago', 'ART Assinada', 'Finalizado', 'Baixa Solicitada', 'Baixa da ART'],
  tecnico: ['Processando', 'Rascunho Pendente', 'Rascunho Reprovado', 'Ajuste Pendente', 'Pagamento Programado', 'Baixa Solicitada', 'Baixa da ART', 'Finalizado'],
  financeiro: ['Pago', 'ART Assinada', 'Finalizado']
};

// ========== UTILITÁRIOS ==========
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, m => map[m]);
}

function formatarDataBR(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: CONFIG.TIMEZONE });
  } catch(e) {
    return '—';
  }
}

function formatarDataHoraBR(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('pt-BR', {
      timeZone: CONFIG.TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch(e) {
    return '—';
  }
}

function formatarMoedaBR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '—';
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusClass(s) {
  const m = {
    'Na fila': 'status-na-fila',
    'Processando': 'status-processando',
    'Rascunho Pendente': 'status-rascunho',
    'Rascunho Reprovado': 'status-reprovado',
    'Ajuste Pendente': 'status-ajuste',
    'Pagamento Programado': 'status-pagamento',
    'Pago': 'status-pago',
    'Finalizado': 'status-finalizado',
    'Baixa Solicitada': 'status-baixa-solicitada',
    'Baixa da ART': 'status-baixa-art',
    'ART Assinada': 'status-art-assinada'
  };
  return m[s] || 'status-na-fila';
}

// ✅ NOVO: Helper para exibição formatada do status
function formatarStatusExibicao(s) {
  return s === 'Pagamento Programado' ? 'Encaminhado para o Financeiro' : s;
}

// Oculta "Rascunho Reprovado" de não-técnicos — exibe como "Processando"
function statusParaExibir(status, perms) {
  if (status === 'Rascunho Reprovado' && !perms.tipoTecnico) return 'Processando';
  return formatarStatusExibicao(status);
}
function statusClassParaExibir(status, perms) {
  if (status === 'Rascunho Reprovado' && !perms.tipoTecnico) return getStatusClass('Processando');
  return getStatusClass(status);
}

// ✅ ATUALIZADO: Permissões com status permitidos e flag de atribuição
function getPermissoes() {
  if (!AppState.usuarioAtual) {
    return { podeEditar: false, podeExcluir: false, podeMudarStatus: false, podeVer: true, tipo: 'anonimo', tipoSolicitante: true, statusPermitidos: [] };
  }
  switch (AppState.usuarioAtual.tipo) {
    case 'admin':
      return { 
        podeEditar: true, 
        podeExcluir: true, 
        podeMudarStatus: true, 
        podeVer: true, 
        podeAtribuir: true, 
        podeAtribuirFinanceiro: true,
        tipo: 'admin', 
        tipoAdmin: true,
        statusPermitidos: STATUS_POR_PERFIL.admin
      };
    case 'tecnico':
      return { 
        podeEditar: false, 
        podeExcluir: false, 
        podeMudarStatus: true, 
        podeVer: true, 
        podeEncaminharFinanceiro: true, 
        podeFinalizar: true, 
        podeAjuste: false, 
        tipo: 'tecnico', 
        tipoTecnico: true,
        statusPermitidos: STATUS_POR_PERFIL.tecnico
      };
    case 'financeiro':
      return { 
        podeEditar: false, 
        podeExcluir: false, 
        podeMudarStatus: true, 
        podeVer: true, 
        podeVerDiretorio: true, 
        podePagar: true, 
        podeEncaminharTecnico: false, 
        tipo: 'financeiro', 
        tipoFinanceiro: true,
        statusPermitidos: STATUS_POR_PERFIL.financeiro
      };
    default:
      return { podeEditar: false, podeExcluir: false, podeMudarStatus: false, podeVer: true, tipo: 'anonimo', statusPermitidos: [] };
  }
}

// ========== SUPABASE CRUD COM FALLBACK LOCAL ==========
async function carregarSolicitacoesDB() {
  if (_sb) {
    try {
      const { data, error } = await _sb
        .from('solicitacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      lsSet(LS.CACHE, data || []);
      return data || [];
    } catch (e) {
      console.warn('Supabase indisponível ao carregar:', e.message);
    }
  }

  const cache = lsGet(LS.CACHE, []);
  if (cache.length > 0) {
    showToast('Modo offline — exibindo dados em cache local.', 'info');
  }
  return cache;
}

async function salvarSolicitacaoDB(dados) {
  if (_sb) {
    try {
      const { data, error } = await _sb
        .from('solicitacoes')
        .insert([dados])
        .select()
        .single();

      if (error) throw error;

      const cache = lsGet(LS.CACHE, []);
      cache.unshift(data);
      lsSet(LS.CACHE, cache);
      return data;
    } catch (e) {
      if (isNetworkError(e)) {
        return _salvarLocal(dados);
      }
      throw e;
    }
  }
  return _salvarLocal(dados);
}

function _salvarLocal(dados) {
  const registro = { ...dados, created_at: new Date().toISOString(), _local: true };
  const cache = lsGet(LS.CACHE, []);
  cache.unshift(registro);
  lsSet(LS.CACHE, cache);
  enfileirarSync({ tipo: 'inserir', dados });
  showToast('Sem conexão — salvo localmente. Será sincronizado em breve.', 'info');
  return registro;
}

async function atualizarSolicitacaoDB(solicitacaoId, dados) {
  if (_sb) {
    try {
      const { data, error } = await _sb
        .from('solicitacoes')
        .update(dados)
        .eq('solicitacao_id', solicitacaoId)
        .select()
        .single();

      if (error) throw error;

      _atualizarCache(solicitacaoId, data);
      return data;
    } catch (e) {
      if (isNetworkError(e)) {
        return _atualizarLocal(solicitacaoId, dados);
      }
      throw e;
    }
  }
  return _atualizarLocal(solicitacaoId, dados);
}

function _atualizarCache(id, novosDados) {
  const cache = lsGet(LS.CACHE, []);
  const idx = cache.findIndex(s => s.solicitacao_id === id);
  if (idx >= 0) cache[idx] = { ...cache[idx], ...novosDados };
  lsSet(LS.CACHE, cache);
}

function _atualizarLocal(solicitacaoId, dados) {
  _atualizarCache(solicitacaoId, dados);
  enfileirarSync({ tipo: 'atualizar', id: solicitacaoId, dados });
  return { solicitacao_id: solicitacaoId, ...dados };
}

async function adicionarHistoricoDB(solicitacaoId, acao, detalhes = '', nomeOverride = null, tipoOverride = null) {
  const registro = {
    solicitacao_id: solicitacaoId,
    acao,
    detalhes,
    usuario_nome: nomeOverride || AppState.usuarioAtual?.nome || 'Sistema',
    usuario_tipo: tipoOverride || AppState.usuarioAtual?.tipo || 'anonimo'
  };

  if (!_sb) {
    enfileirarSync({ tipo: 'historico', dados: registro });
    return;
  }
  try {
    const { error } = await _sb.from('historico').insert([registro]);
    if (error) throw error;
  } catch (e) {
    if (isNetworkError(e)) {
      enfileirarSync({ tipo: 'historico', dados: registro });
    } else {
      console.error('Erro ao salvar histórico:', e);
    }
  }
}

async function carregarHistoricoDB(solicitacaoId) {
  if (_sb) {
    try {
      const { data, error } = await _sb
        .from('historico')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .order('created_at', { ascending: false });

      if (!error) return data || [];
    } catch (e) {
      console.warn('Histórico offline:', e.message);
    }
  }

  const cache = lsGet(LS.HIST, {});
  return (cache[solicitacaoId] || []);
}

// ========== SINCRONIZAÇÃO DA FILA OFFLINE ==========
async function processarFilaSync() {
  if (!_sb) return;
  const fila = lsGet(LS.QUEUE, []);
  if (!fila.length) return;

  const pendentes = [];
  let sincronizados = 0;

  for (const op of fila) {
    try {
      if (op.tipo === 'inserir') {
        const { error } = await _sb.from('solicitacoes').insert([op.dados]);
        if (error && !error.message?.includes('duplicate') && !error.code?.includes('23505')) throw error;
      } else if (op.tipo === 'atualizar') {
        const { error } = await _sb.from('solicitacoes')
          .update(op.dados).eq('solicitacao_id', op.id);
        if (error) throw error;
      } else if (op.tipo === 'excluir') {
        const { error } = await _sb.from('solicitacoes')
          .delete().eq('solicitacao_id', op.id);
        if (error) throw error;
      } else if (op.tipo === 'historico') {
        const { error } = await _sb.from('historico').insert([op.dados]);
        if (error) throw error;
      }
      sincronizados++;
    } catch (e) {
      if (isNetworkError(e)) {
        pendentes.push(op);
        break;
      }
      console.warn('Op sync ignorada:', e.message);
    }
  }

  lsSet(LS.QUEUE, pendentes);

  if (sincronizados > 0) {
    showToast(`${sincronizados} registro(s) sincronizado(s) com o servidor.`, 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  }
}

// ========== GERAR ID SEGURO ==========
function gerarNovoId() {
  const nums = AppState.solicitacoes
    .map(s => parseInt((s.solicitacao_id || '').replace('ART-', ''), 10))
    .filter(n => !isNaN(n));
  const proximo = nums.length ? Math.max(...nums) + 1 : 1;
  return `ART-${String(proximo).padStart(3, '0')}`;
}

// ========== SALVAR ==========
async function salvarSolicitacao() {
  const tipo = DOM.tipoSolicitacao?.value;
  
  if (!tipo) {
    showToast('Selecione o tipo de solicitação.', 'error');
    return;
  }
  
  if (!validarFormulario(tipo)) {
    showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }
  
  const dados = coletarDadosFormulario(tipo);
  
  try {
    if (AppState.solicitacaoEditando) {
      await atualizarSolicitacaoDB(AppState.solicitacaoEditando, dados);
      await adicionarHistoricoDB(AppState.solicitacaoEditando, 'Edição', 'Dados atualizados');
      showToast('Atualizado com sucesso!', 'success');
      AppState.solicitacaoEditando = null;
    } else {
      delete dados.solicitacao_id;
      delete dados.id;
      delete dados.created_at;
      delete dados.updated_at;

      dados.dataSolicitacao = new Date().toISOString().split('T')[0];

      const novoId = gerarNovoId();
      dados.solicitacao_id = novoId;
      dados.status = 'Processando';
      dados.tecnico_responsavel = 'Henrique';

      const resultado = await salvarSolicitacaoDB(dados);
      if (!resultado?._local) {
        showToast(`${novoId} criada e encaminhada para Henrique!`, 'success');
        await adicionarHistoricoDB(novoId, 'Atribuição Automática', 'Encaminhado para Henrique');
      }
    }

    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharFormulario();
    
  } catch(e) {
    console.error('Erro ao salvar:', e);
    if (e.message?.includes('duplicate') || e.message?.includes('23505')) {
      showToast('ID duplicado — tente novamente.', 'error');
    } else if (isNetworkError(e)) {
      showToast('Sem conexão com o servidor. Dados salvos localmente.', 'info');
      AppState.solicitacoes = lsGet(LS.CACHE, []);
      renderizarTabela();
      atualizarKPIs();
      fecharFormulario();
    } else {
      showToast(`Erro ao salvar: ${e.message || 'Verifique o console (F12).'}`, 'error');
    }
  }
}

// ========== VALIDAÇÃO DE SENHA (admin / financeiro) ==========
async function validarSenhaNoBanco(tipo, nome, senha) {
  if (!_sb) {
    showToast('Servidor indisponível. Verifique sua conexão.', 'error');
    return false;
  }
  try {
    const { data, error } = await _sb.rpc('validar_credencial_banco', {
      p_tipo: tipo,
      p_nome: nome,
      p_senha: senha
    });
    if (error) {
      console.error('Erro na validação RPC:', error);
      showToast('Erro ao validar credenciais. Tente novamente.', 'error');
      return false;
    }
    return data === true;
  } catch (e) {
    console.error('Falha ao conectar para login:', e);
    if (isNetworkError(e)) {
      showToast('Sem conexão com o servidor. Não é possível fazer login agora.', 'error');
    } else {
      showToast('Erro inesperado ao validar acesso.', 'error');
    }
    return false;
  }
}

// ========== IDENTIFICAÇÃO POR CÓDIGO (Equipe ADM) ==========
// Consulta direta na tabela "usuarios": tipo + senha + ativo = true → retorna nome.
// Não usa RPC — evita erro 406 por função inexistente.
async function buscarNomePorCodigo(p_tipo, p_senha) {
  if (!_sb) {
    showToast('Servidor indisponível. Verifique sua conexão.', 'error');
    return null;
  }

  console.log('[Login ADM] Tabela: usuarios | Tipo:', p_tipo, '| Código: ***' + p_senha.slice(-2));

  try {
    const { data, error } = await _sb
      .from('usuarios')
      .select('nome')
      .eq('tipo', p_tipo)
      .eq('senha', p_senha)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.error('[Login ADM] Erro Supabase — code:', error.code, '| message:', error.message, '| details:', error.details);
      showToast('Erro ao validar acesso. Tente novamente.', 'error');
      return null;
    }

    if (data?.nome) {
      console.log('[Login ADM] Usuário identificado:', data.nome);
    } else {
      console.log('[Login ADM] Nenhum usuário encontrado com esse código em usuarios (tipo =', p_tipo, ', ativo = true).');
    }

    return data?.nome || null;

  } catch (e) {
    console.error('[Login ADM] Exceção inesperada:', e.message || e);
    if (isNetworkError(e)) {
      showToast('Sem conexão com o servidor. Não é possível fazer login agora.', 'error');
    } else {
      showToast('Erro ao validar acesso. Tente novamente.', 'error');
    }
    return null;
  }
}

// ========== TEMA CLARO / ESCURO ==========
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Troca logo
  const logoImg = document.querySelector('.logo img');
  if (logoImg) {
    logoImg.src = theme === 'light' ? 'images/logo-preto.png' : 'images/LOGO.png';
  }

  // Troca ícone do slider
  const slider = document.getElementById('themeSlider');
  if (!slider) return;
  if (theme === 'light') {
    slider.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  } else {
    slider.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('sgart_theme', next);
}

// ========== INICIALIZAÇÃO ==========
function initCache() {
  console.log('🔍 Inicializando cache DOM...');
  
  DOM.formContainer = document.getElementById('formContainer');
  DOM.artForm = document.getElementById('artForm');
  DOM.artTableBody = document.getElementById('artTableBody');
  DOM.tableEmpty = document.getElementById('tableEmpty');
  DOM.searchInput = document.getElementById('searchInput');
  DOM.toastContainer = document.getElementById('toastContainer');
  DOM.tipoSolicitacao = document.getElementById('tipoSolicitacao');
  DOM.formCREA = document.getElementById('formCREA');
  DOM.formCRBio = document.getElementById('formCRBio');
  DOM.btnAddAtividadeCREA = document.getElementById('btnAddAtividadeCREA');
  DOM.atividadesCREAContainer = document.getElementById('atividadesCREAContainer');
  
  DOM.loginModal = document.getElementById('loginModal');
  DOM.modalOverlay = document.getElementById('modalOverlay');
  DOM.statusModalOverlay = document.getElementById('statusModalOverlay');
  DOM.editModalOverlay = document.getElementById('editModalOverlay');
  DOM.ajusteModalOverlay = document.getElementById('ajusteModalOverlay');
  DOM.baixaModalOverlay = document.getElementById('baixaModalOverlay');
  DOM.reprovarRascunhoModalOverlay = document.getElementById('reprovarRascunhoModalOverlay');
  
  DOM.filterConselho = document.getElementById('filterConselho');
  DOM.filterSetor = document.getElementById('filterSetor');
  
  DOM.paginationContainer = document.getElementById('paginationContainer');
  DOM.paginationInfo = document.getElementById('paginationInfo');
  DOM.paginationNumbers = document.getElementById('paginationNumbers');
  DOM.btnFirst = document.getElementById('btnFirst');
  DOM.btnPrev = document.getElementById('btnPrev');
  DOM.btnNext = document.getElementById('btnNext');
  DOM.btnLast = document.getElementById('btnLast');
  DOM.perPageSelect = document.getElementById('perPage');
  
  ['Total', 'Fila', 'Processando', 'Rascunho', 'Ajuste', 'Pagamento', 'Pago', 'ArtAssinada', 'Finalizado', 'BaixaSolicitada', 'Baixa'].forEach(k => {
    DOM.kpis[k] = document.getElementById(`kpi${k}`);
  });
  
  DOM.filterPills = Array.from(document.querySelectorAll('.filter-pill'));
  
  // ✅ NOVO: Cache de elementos de notificação
  DOM.notificacoesFinanceiro = document.getElementById('notificacoesFinanceiro');
  DOM.badgePagamentosPendentes = document.getElementById('badgePagamentosPendentes');
  DOM.listaPagamentosPendentes = document.getElementById('listaPagamentosPendentes');
  
  console.log('✅ Cache DOM inicializado');
}

// ========== AUTENTICAÇÃO ==========
function toggleSenha() {
  const input = document.getElementById('senhaAcesso');
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const iconVer = document.getElementById('iconSenhaVer');
  const iconOcultar = document.getElementById('iconSenhaOcultar');
  if (iconVer && iconOcultar) {
    iconVer.classList.toggle('hidden', isPassword);
    iconOcultar.classList.toggle('hidden', !isPassword);
  }
}

async function fazerLogin() {
  const senha = document.getElementById('senhaAcesso')?.value || '';
  const errorEl = document.getElementById('loginError');

  if (!senha) {
    errorEl.textContent = 'Informe o código ou senha de acesso.';
    errorEl.classList.remove('hidden');
    return;
  }

  const tipo = AppState.tipoLoginAtual;
  let nomeExibicao = '';

  if (tipo === 'tecnico') {
    // Consulta o banco: qual usuário da Equipe ADM tem este código?
    // A RPC retorna o nome exato ou null — sem adivinhar, sem hardcoding.
    nomeExibicao = await buscarNomePorCodigo('Equipe ADM', senha);
    if (!nomeExibicao) {
      errorEl.textContent = 'Código incorreto. Tente novamente.';
      errorEl.classList.remove('hidden');
      return;
    }
  } else if (tipo === 'admin') {
    if (!await validarSenhaNoBanco('admin', 'Gestor Administrativo', senha)) {
      errorEl.textContent = 'Senha incorreta. Tente novamente.';
      errorEl.classList.remove('hidden');
      return;
    }
    nomeExibicao = 'Gestor';
  } else {
    if (!await validarSenhaNoBanco('financeiro', 'Gestor Financeiro', senha)) {
      errorEl.textContent = 'Senha incorreta. Tente novamente.';
      errorEl.classList.remove('hidden');
      return;
    }
    nomeExibicao = 'Financeiro';
  }

  AppState.usuarioAtual = { tipo, nome: nomeExibicao };
  localStorage.setItem('seteg_usuario', JSON.stringify(AppState.usuarioAtual));

  fecharModalLogin();
  atualizarInterfaceUsuario();
  renderizarTabela();
  atualizarNotificacoesFinanceiro();
  showToast(`Olá, ${nomeExibicao}! 👋`, 'success');
}

async function logout() {
  const confirmou = await confirmarAcao(
    'Tem certeza que deseja sair do sistema?',
    'Confirmar saída'
  );
  if (!confirmou) return;
  localStorage.removeItem('seteg_usuario');
  AppState.usuarioAtual = null;
  location.reload();
}

function verificarSessao() {
  try {
    const s = localStorage.getItem('seteg_usuario');
    if (s) {
      AppState.usuarioAtual = JSON.parse(s);
      atualizarInterfaceUsuario();
      atualizarNotificacoesFinanceiro(); // ✅ NOVO: Atualizar notificações ao verificar sessão
    }
  } catch(e) {
    localStorage.removeItem('seteg_usuario');
  }
}

// ✅ ATUALIZADO: Ocultar formulário para perfis logados
function atualizarInterfaceUsuario() {
  const ui = document.getElementById('userInfo');
  const bg = document.getElementById('userBadge');
  
  // ✅ NOVO: Ocultar card de nova solicitação e formulário para perfis logados
  const restritos = document.querySelectorAll('[data-restrito="true"]');
  if (AppState.usuarioAtual) {
    restritos.forEach(el => el.classList.add('hidden'));
  } else {
    restritos.forEach(el => el.classList.remove('hidden'));
  }
  
  const welcomeBanner = document.getElementById('userWelcomeBanner');

  if (AppState.usuarioAtual && ui && bg) {
    ui.classList.remove('hidden');
    const ic = {
      admin: '🛡',
      tecnico: '👥',
      financeiro: '💳'
    }[AppState.usuarioAtual.tipo] || '👤';
    bg.textContent = `${ic} ${AppState.usuarioAtual.nome}`;
    if (welcomeBanner) {
      const primeiroNome = AppState.usuarioAtual.nome.split(' ')[0];
      welcomeBanner.innerHTML = `<span class="welcome-icon">${ic}</span> Bem-vindo(a), <span class="welcome-name">${primeiroNome}</span>`;
      welcomeBanner.classList.remove('hidden');
    }
  } else if (ui) {
    ui.classList.add('hidden');
    if (welcomeBanner) welcomeBanner.classList.add('hidden');
  }
}

function abrirModalLogin(tipo) {
  AppState.tipoLoginAtual = tipo;

  const titulos = {
    admin: 'Acesso – Gestor',
    tecnico: 'Acesso – Equipe ADM',
    financeiro: 'Acesso – Financeiro'
  };

  const textos = {
    admin: 'Informe a senha de acesso para o perfil Gestor.',
    tecnico: 'Informe o código de acesso da Equipe ADM.',
    financeiro: 'Informe a senha de acesso para o perfil Financeiro.'
  };

  const titleEl = document.getElementById('loginModalTitle');
  if (titleEl) titleEl.textContent = titulos[tipo] || 'Acesso Restrito';

  const textoEl = document.getElementById('loginTipoTexto');
  if (textoEl) textoEl.textContent = textos[tipo] || 'Digite a senha para acessar.';

  const labelEl = document.getElementById('loginSenhaLabel');
  if (labelEl) labelEl.textContent = tipo === 'tecnico' ? 'Código de Acesso' : 'Senha';

  const senhaField = document.getElementById('senhaAcesso');
  if (senhaField) {
    senhaField.value = '';
    senhaField.placeholder = tipo === 'tecnico' ? 'Digite o código de acesso' : 'Digite sua senha';
    senhaField.type = 'password';
  }

  const iconVer = document.getElementById('iconSenhaVer');
  const iconOcultar = document.getElementById('iconSenhaOcultar');
  if (iconVer) iconVer.classList.remove('hidden');
  if (iconOcultar) iconOcultar.classList.add('hidden');

  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.classList.add('hidden');

  DOM.loginModal?.classList.add('active');
  setTimeout(() => senhaField?.focus(), 100);
}

function fecharModalLogin(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (DOM.loginModal) {
    DOM.loginModal.classList.remove('active');
  }
  const senhaField = document.getElementById('senhaAcesso');
  if (senhaField) { senhaField.value = ''; senhaField.type = 'password'; }
  const iconVer = document.getElementById('iconSenhaVer');
  const iconOcultar = document.getElementById('iconSenhaOcultar');
  if (iconVer) iconVer.classList.remove('hidden');
  if (iconOcultar) iconOcultar.classList.add('hidden');
  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.classList.add('hidden');
  AppState.tipoLoginAtual = null;
}

// ========== FORMULÁRIO ==========
function definirMinPrazoEmissao() {
  const hoje = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[name="prazoEmissaoArt"]').forEach(el => {
    el.min = hoje;
  });
}

function toggleFormulario() {
  const c = DOM.formContainer;
  const t = document.getElementById('btnToggleText');
  const b = document.getElementById('btnNovaSolicitacao');

  if (!c || !t) return;

  if (c.classList.contains('expanded')) {
    fecharFormulario();
  } else {
    c.classList.add('expanded');
    t.textContent = 'Fechar Formulário';
    if (b) b.setAttribute('aria-expanded', 'true');
    definirMinPrazoEmissao();
  }
}

function fecharFormulario() {
  const c = DOM.formContainer;
  const t = document.getElementById('btnToggleText');
  const b = document.getElementById('btnNovaSolicitacao');
  
  if (!c || !t) return;
  
  c.classList.remove('expanded');
  t.textContent = 'Nova Solicitação';
  if (b) b.setAttribute('aria-expanded', 'false');
  
  setTimeout(() => {
    if (DOM.artForm) DOM.artForm.reset();
    limparAtividadesCREA();
    if (DOM.tipoSolicitacao) DOM.tipoSolicitacao.value = '';
    if (DOM.formCREA) DOM.formCREA.classList.add('hidden');
    if (DOM.formCRBio) DOM.formCRBio.classList.add('hidden');
    AppState.solicitacaoEditando = null;
    document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
  }, 300);
}

// ========== LINK DINÂMICO LOCAL DA ART ==========
function atualizarLinkArt(tipo, value) {
  const link = document.getElementById(`linkAbrirArt${tipo}`);
  if (!link) return;
  const isUrl = value && /^https?:\/\//i.test(value.trim());
  if (isUrl) {
    link.href = value.trim();
    link.classList.remove('hidden');
  } else {
    link.href = '#';
    link.classList.add('hidden');
  }
}

// ========== TÉCNICO OUTROS (CREA) ==========
function toggleOutrosTecnicoCREA(value) {
  const container = document.getElementById('outrosTecnicoContainerCREA');
  if (!container) return;
  if (value === 'OUTROS') {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
    const nomeEl = document.getElementById('outrosTecnicoNomeCREA');
    const justEl = document.getElementById('outrosTecnicoJustificativaCREA');
    if (nomeEl) nomeEl.value = '';
    if (justEl) justEl.value = '';
  }
}

// ========== ATIVIDADES CREA ==========
function limparAtividadesCREA() {
  if (DOM.atividadesCREAContainer) {
    DOM.atividadesCREAContainer.innerHTML = '';
  }
  AppState.atividadeCREAIndex = 0;
}

function adicionarAtividadeCREA() {
  const c = DOM.atividadesCREAContainer;
  if (!c) return;
  
  const count = c.children.length;
  if (count >= CONFIG.MAX_ATIVIDADES) {
    showToast(`Máximo de ${CONFIG.MAX_ATIVIDADES} atividades.`, 'error');
    return;
  }
  
  AppState.atividadeCREAIndex++;
  const idx = AppState.atividadeCREAIndex;
  
  const nO = '<option value="">Nível</option>' + NIVEIS_ATIVIDADE.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  const pO = '<option value="">Atividade</option>' + ATIVIDADES_PROFISSIONAIS.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  
  const card = document.createElement('div');
  card.className = 'atividade-card';
  card.dataset.index = idx;
  card.innerHTML = `
    <div class="atividade-header" role="button" tabindex="0">
      <span class="atividade-number">Atividade ${count + 1}</span>
      <span class="atividade-preview" id="preview-${idx}">Selecione...</span>
      <button type="button" class="btn btn-ghost-sm atividade-btn-remove">✕</button>
    </div>
    <div class="atividade-body open" id="body-${idx}">
      <div class="atividade-cascade">
        <div class="form-group">
          <label class="form-label required">Nível</label>
          <select class="form-control cascade-nivel" data-idx="${idx}">${nO}</select>
        </div>
        <div class="form-group">
          <label class="form-label required">Atividade</label>
          <select class="form-control cascade-profissional" data-idx="${idx}">${pO}</select>
        </div>
        <div class="form-group full-width">
          <label class="form-label required">Descrição</label>
          <div class="descricao-servico-wrapper">
            <textarea class="form-control cascade-descricao" data-idx="${idx}" rows="2" placeholder="Descreva..." required></textarea>
            <button type="button" class="btn-consultar-tabela" onclick="consultarTabelaAtividades()" title="Consultar tabela">
              📋 Tabela
            </button>
          </div>
        </div>
      </div>
      <div class="atividade-form-actions">
        <button type="button" class="btn btn-success btn-salvar-atividade" data-idx="${idx}">✔ Salvar Atividade</button>
      </div>
    </div>
    <div class="atividade-saved-block hidden" id="saved-${idx}">
      <div class="atividade-saved-info" id="saved-info-${idx}"></div>
      <button type="button" class="btn btn-ghost-sm btn-editar-atividade" data-idx="${idx}">✏ Editar</button>
    </div>
  `;
  
  c.appendChild(card);
  setupAtividadeEventListeners(card, idx);
}

function setupAtividadeEventListeners(card, idx) {
  card.querySelector('.atividade-btn-remove')?.addEventListener('click', () => {
    card.remove();
    renumerarAtividades();
  });

  card.querySelector('.cascade-nivel')?.addEventListener('change', () => atualizarResumoAtividade(idx));
  card.querySelector('.cascade-profissional')?.addEventListener('change', () => atualizarResumoAtividade(idx));
  card.querySelector('.cascade-descricao')?.addEventListener('input', () => atualizarResumoAtividade(idx));

  card.querySelector('.btn-salvar-atividade')?.addEventListener('click', () => salvarBlocoAtividade(idx));
  card.querySelector('.btn-editar-atividade')?.addEventListener('click', () => editarBlocoAtividade(idx));
}

function salvarBlocoAtividade(idx) {
  const card = document.querySelector(`.atividade-card[data-index="${idx}"]`);
  if (!card) return;
  const v = cl => card.querySelector(cl)?.value?.trim() || '';
  const nivel = v('.cascade-nivel');
  const atividade = v('.cascade-profissional');
  const descricao = v('.cascade-descricao');

  if (!nivel || !atividade || !descricao) {
    showToast('Preencha Nível, Atividade e Descrição antes de salvar.', 'error');
    return;
  }

  const savedInfo = document.getElementById(`saved-info-${idx}`);
  if (savedInfo) {
    savedInfo.innerHTML = `
      <div class="atividade-saved-tags">
        <span class="atividade-tag">${escapeHtml(nivel)}</span>
        <span class="atividade-tag">${escapeHtml(atividade)}</span>
      </div>
      <p class="atividade-saved-descricao">${escapeHtml(descricao)}</p>
    `;
  }

  document.getElementById(`body-${idx}`)?.classList.add('hidden');
  document.getElementById(`saved-${idx}`)?.classList.remove('hidden');

  const preview = document.getElementById(`preview-${idx}`);
  if (preview) preview.textContent = `${nivel} › ${atividade}`;
}

function editarBlocoAtividade(idx) {
  document.getElementById(`body-${idx}`)?.classList.remove('hidden');
  document.getElementById(`saved-${idx}`)?.classList.add('hidden');
}

function renumerarAtividades() {
  document.querySelectorAll('#atividadesCREAContainer .atividade-card').forEach((c, i) => {
    const n = c.querySelector('.atividade-number');
    if (n) n.textContent = `Atividade ${i + 1}`;
  });
}

function atualizarResumoAtividade(idx) {
  const c = document.querySelector(`.atividade-card[data-index="${idx}"]`);
  if (!c) return;
  
  const v = cl => c.querySelector(cl)?.value || '';
  const n = v('.cascade-nivel');
  const p = v('.cascade-profissional');
  const d = v('.cascade-descricao');
  
  const pr = document.getElementById(`preview-${idx}`);
  const sm = document.getElementById(`summary-${idx}`);
  
  if (n || p || d) {
    const t = [n, p].filter(Boolean).join(' › ');
    if (pr) pr.textContent = t || 'Preencha';
    if (sm) {
      sm.textContent = d ? `${t} – ${d}` : t;
      sm.style.color = '#6CC24A';
    }
  } else {
    if (pr) pr.textContent = 'Selecione...';
    if (sm) {
      sm.textContent = 'Preencha os campos';
      sm.style.color = '#5A6580';
    }
  }
}

function consultarTabelaAtividades() {
  window.open('doc/LISTA_ATIVIDADES_CREA.pdf', '_blank');
}

function coletarAtividadesCREA() {
  const a = [];
  document.querySelectorAll('#atividadesCREAContainer .atividade-card').forEach(c => {
    const v = cl => c.querySelector(cl)?.value?.trim() || '';
    const n = v('.cascade-nivel');
    const p = v('.cascade-profissional');
    const d = v('.cascade-descricao');
    if (n && p && d) {
      a.push({
        nivel: escapeHtml(n),
        atividadeProfissional: escapeHtml(p),
        descricaoServico: escapeHtml(d),
        resumo: escapeHtml(`${n} › ${p}`)
      });
    }
  });
  return a;
}

// ========== COLETAR E VALIDAR DADOS ==========
function coletarDadosFormulario(tipo) {
  const p = document.getElementById(`form${tipo}`);
  if (!p) return {};
  
  const d = { tipo };
  
  p.querySelectorAll('.form-control').forEach(i => {
    if (!i.name) return;
    let v = i.value.trim();
    // ✅ # mantido no banco e na visualização
    if (i.classList.contains('mask-currency')) {
      try {
        v = parseFloat(v.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      } catch(e) {
        v = 0;
      }
    }
    d[i.name] = typeof v === 'string' ? escapeHtml(v) : v;
  });
  
  if (tipo === 'CRBio') {
    const vinc = document.querySelector('input[name="vinculadoACMB"]:checked');
    if (vinc) d.vinculado_acmb = vinc.value;
    const rascunho = p.querySelector('input[name="rascunhoARTCRBio"]:checked');
    if (rascunho) d.rascunho_art = rascunho.value;
  }

  if (tipo === 'CREA') {
    d.atividades = coletarAtividadesCREA();
    const rascunho = p.querySelector('input[name="rascunhoARTCREA"]:checked');
    if (rascunho) d.rascunho_art = rascunho.value;
    if (d.nomeTecnico === 'OUTROS') {
      const nomeEl = document.getElementById('outrosTecnicoNomeCREA');
      const justEl = document.getElementById('outrosTecnicoJustificativaCREA');
      if (nomeEl) d.outrosTecnicoNome = escapeHtml(nomeEl.value.trim());
      if (justEl) d.outrosTecnicoJustificativa = escapeHtml(justEl.value.trim());
    }
  }
  
  return d;
}

function validarFormulario(tipo) {
  const p = document.getElementById(`form${tipo}`);
  if (!p) return false;
  
  let ok = true;
  
  p.querySelectorAll('.form-control[required]').forEach(f => {
    if (f.closest('.hidden')) return;
    if (f.tagName === 'SELECT' || f.tagName === 'INPUT' || f.tagName === 'TEXTAREA') {
      if (!f.value.trim()) {
        f.classList.add('error');
        ok = false;
      } else {
        f.classList.remove('error');
      }
    }
  });
  
  // Prazo de emissão nunca pode ser anterior à data de criação da ART
  const campoPrazo = p.querySelector('input[name="prazoEmissaoArt"]');
  if (campoPrazo && campoPrazo.value) {
    const prazo = new Date(campoPrazo.value + 'T00:00:00');
    let dataCriacao;
    if (AppState.solicitacaoEditando) {
      const registro = AppState.solicitacoes.find(s => s.solicitacao_id === AppState.solicitacaoEditando);
      dataCriacao = registro?.created_at ? new Date(registro.created_at) : new Date();
    } else {
      dataCriacao = new Date();
    }
    dataCriacao.setHours(0, 0, 0, 0);
    if (prazo < dataCriacao) {
      campoPrazo.classList.add('error');
      showToast('O prazo de emissão da ART não pode ser anterior à data de criação.', 'error');
      ok = false;
    }
  }

  if (tipo === 'CRBio') {
    const vinc = document.querySelector('input[name="vinculadoACMB"]:checked');
    if (!vinc) {
      showToast('Selecione se está vinculado à ACMB.', 'error');
      ok = false;
    }
  }
  
  if (tipo === 'CREA') {
    const cards = document.querySelectorAll('#atividadesCREAContainer .atividade-card');
    if (!cards.length) {
      showToast('Adicione pelo menos uma atividade.', 'error');
      return false;
    }
    cards.forEach(c => {
      const v = cl => c.querySelector(cl)?.value?.trim();
      if (!v('.cascade-nivel') || !v('.cascade-profissional') || !v('.cascade-descricao')) {
        showToast('Preencha todos os campos das atividades.', 'error');
        ok = false;
      }
    });
  }
  
  return ok;
}

// ========== FILTRO DE SOLICITAÇÕES POR PERFIL ==========
// Centraliza a lógica de filtro por usuário — usada por tabela E KPIs.
// Para tecnico: compara tecnico_responsavel contra nome completo OU primeiro nome.
// (Necessário porque o banco pode ter 'Kevilla' ou 'Kevilla Alencar' no campo.)
function getSolicitacoesDoUsuario(todas) {
  const u = AppState.usuarioAtual;
  if (!u) return todas;

  if (u.tipo === 'tecnico') {
    const nomeCompleto = (u.nome || '').trim();
    const primeiroNome = nomeCompleto.split(' ')[0];

    console.log('[Filtro ADM] Usuário logado:', nomeCompleto);
    console.log('[Filtro ADM] Comparando tecnico_responsavel contra:', `"${nomeCompleto}"`, 'ou', `"${primeiroNome}"`);

    const resultado = todas.filter(s => {
      const tr = (s.tecnico_responsavel || '').trim();
      return tr === nomeCompleto || tr === primeiroNome;
    });

    console.log('[Filtro ADM] Solicitações encontradas:', resultado.length, 'de', todas.length, 'totais');
    return resultado;
  }

  if (u.tipo === 'financeiro') {
    return todas.filter(s =>
      s.encaminhar_financeiro === true || s.status === 'Pagamento Programado'
    );
  }

  return todas; // admin vê tudo
}

// ========== CARREGAR DADOS ==========
async function carregarDados() {
  try {
    // Primeiro tenta sincronizar a fila pendente
    await processarFilaSync();
    AppState.solicitacoes = await carregarSolicitacoesDB();
    console.log('✅ Solicitações carregadas:', AppState.solicitacoes.length);
  } catch(e) {
    console.error('Erro ao carregar dados:', e);
    AppState.solicitacoes = lsGet(LS.CACHE, []);
  }
}

// ✅ ATUALIZADO: Filtrar solicitações por atribuição
function renderizarTabela() {
  const tb = DOM.artTableBody;
  if (!tb) return;
  
  const fs = document.querySelector('.filter-pill.active')?.dataset.status || 'todas';
  const fc = DOM.filterConselho?.value || '';
  const bus = DOM.searchInput?.value.toLowerCase().trim() || '';
  const perms = getPermissoes();
  
  // Aplica filtro de perfil (tecnico, financeiro, admin)
  let dados = getSolicitacoesDoUsuario(AppState.solicitacoes);

  // Filtros adicionais
  dados = dados.filter(s => {
    if (fs !== 'todas' && s.status !== fs) return false;
    if (fc && s.tipo !== fc) return false;
    if (bus) {
      const t = [s.solicitacao_id, s.solicitante, s.contratante, s.nomeTecnico, s.tecnico_responsavel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!t.includes(bus)) return false;
    }
    return true;
  });
  
  const total = dados.length;
  AppState.totalPaginas = Math.ceil(total / AppState.itensPorPagina) || 1;
  
  if (AppState.paginaAtual > AppState.totalPaginas) {
    AppState.paginaAtual = AppState.totalPaginas;
  }
  
  const ini = (AppState.paginaAtual - 1) * AppState.itensPorPagina;
  const fim = ini + AppState.itensPorPagina;
  const page = dados.slice(ini, fim);
  
  tb.innerHTML = '';
  
  if (!total) {
    if (DOM.tableEmpty) DOM.tableEmpty.classList.add('visible');
    if (DOM.paginationContainer) DOM.paginationContainer.style.display = 'none';
    return;
  }
  
  if (DOM.tableEmpty) DOM.tableEmpty.classList.remove('visible');
  if (DOM.paginationContainer) DOM.paginationContainer.style.display = 'flex';
  
  const frag = document.createDocumentFragment();
  page.forEach(s => frag.appendChild(renderTableRow(s, perms)));
  tb.appendChild(frag);
  
  if (DOM.paginationInfo) {
    const si = total > 0 ? ini + 1 : 0;
    const sf2 = Math.min(fim, total);
    DOM.paginationInfo.textContent = `${si}-${sf2} de ${total}`;
  }
  
  renderizarNumerosPagina();
  atualizarNotificacoesFinanceiro(); // ✅ NOVO: Atualizar notificações após renderizar
}

function renderTableRow(s, perms) {
  const sc = statusClassParaExibir(s.status, perms);
  const cc = s.tipo === 'CRBio' ? 'cr-bio' : '';
  const sf = str => escapeHtml(str || '—');
  
  let a = `<button class="btn btn-ghost-sm" data-action="ver" data-id="${s.solicitacao_id}" title="Ver Detalhes">${ICONS.ver}</button>`;

  if (perms.tipoAdmin) {
    a += `<button class="btn btn-ghost-sm" data-action="atribuir" data-id="${s.solicitacao_id}" title="Atribuir Técnico">${ICONS.atribuir}</button>`;
  }

  if (perms.tipoTecnico) {
    const statusAtivos = !['Pagamento Programado', 'Finalizado', 'Pago', 'ART Assinada', 'Baixa Solicitada', 'Baixa da ART'].includes(s.status);
    if (statusAtivos && perms.podeEncaminharFinanceiro) {
      a += `<button class="btn btn-ghost-sm btn-encaminhar" data-action="encaminhar-financeiro" data-id="${s.solicitacao_id}" title="Enviar para o Financeiro">${ICONS.encaminhar}</button>`;
    }
    if (s.rascunho_art === 'sim' && ['Processando', 'Rascunho Reprovado'].includes(s.status)) {
      a += `<button class="btn btn-ghost-sm" data-action="enviar-rascunho" data-id="${s.solicitacao_id}" title="Enviar Rascunho para Aprovação">${ICONS.enviarRascunho}</button>`;
    }
    if (!['Finalizado', 'Baixa Solicitada', 'Baixa da ART', 'Rascunho Pendente', 'Rascunho Reprovado'].includes(s.status)) {
      a += `<button class="btn btn-ghost-sm" data-action="finalizar" data-id="${s.solicitacao_id}" title="Finalizar">${ICONS.finalizar}</button>`;
    }
    if (s.status === 'Baixa Solicitada') {
      a += `<button class="btn btn-ghost-sm" data-action="confirmar-baixa" data-id="${s.solicitacao_id}" title="Confirmar Baixa da ART">${ICONS.confirmarBaixa}</button>`;
    }
  }

  if ((perms.tipoSolicitante || perms.tipoAdmin) && s.status === 'Rascunho Pendente') {
    a += `<button class="btn btn-ghost-sm" data-action="aprovar-rascunho" data-id="${s.solicitacao_id}" title="Aprovar Rascunho da ART">${ICONS.aprovarRascunho}</button>`;
    a += `<button class="btn btn-ghost-sm" data-action="reprovar-rascunho" data-id="${s.solicitacao_id}" title="Reprovar Rascunho da ART">${ICONS.reprovarRascunho}</button>`;
  }

  if (perms.tipoFinanceiro) {
    if (s.status === 'Pagamento Programado') {
      if (s.tipo === 'CREA') {
        a += `<button class="btn btn-ghost-sm" data-action="pagar" data-id="${s.solicitacao_id}" title="Marcar como Pago">${ICONS.pagar}</button>`;
      } else {
        a += `<button class="btn btn-ghost-sm" data-action="assinar-art" data-id="${s.solicitacao_id}" title="Assinar ART">${ICONS.assinar}</button>`;
      }
    }
  }

  if (perms.tipoAdmin) {
    if (perms.podeMudarStatus) {
      a += `<button class="btn btn-ghost-sm" data-action="status" data-id="${s.solicitacao_id}" title="Alterar Status">${ICONS.status}</button>`;
    }
    if (perms.podeExcluir) {
      a += `<button class="btn btn-ghost-sm" data-action="excluir" data-id="${s.solicitacao_id}" title="Excluir">${ICONS.excluir}</button>`;
    }
  }

  const statusTerminal = ['Finalizado', 'Baixa Solicitada', 'Baixa da ART'];
  if ((perms.tipoAdmin || perms.tipoSolicitante) && s.status === 'Processando') {
    a += `<button class="btn btn-ghost-sm" data-action="ajuste" data-id="${s.solicitacao_id}" title="Solicitar Ajuste">${ICONS.ajuste}</button>`;
  } else if (perms.tipoTecnico && !statusTerminal.includes(s.status)) {
    a += `<button class="btn btn-ghost-sm" data-action="ajuste" data-id="${s.solicitacao_id}" title="Solicitar Ajuste">${ICONS.ajuste}</button>`;
  }
  if ((perms.tipoSolicitante || perms.tipoAdmin) && s.status === 'Ajuste Pendente') {
    a += `<button class="btn btn-ghost-sm" data-action="ajuste-realizado" data-id="${s.solicitacao_id}" title="Marcar Ajuste Realizado">${ICONS.finalizar}</button>`;
  }

  // Baixa disponível para qualquer pessoa quando status = Finalizado
  if (s.status === 'Finalizado' && !s.baixa_solicitada) {
    a += `<button class="btn btn-ghost-sm" data-action="baixa" data-id="${s.solicitacao_id}" title="Solicitar Baixa da ART">${ICONS.baixa}</button>`;
  }
  
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${sf(s.solicitacao_id)}</strong></td>
    <td><span class="conselho-badge ${cc}">${sf(s.tipo)}</span></td>
    <td>${sf(s.solicitante)}</td>
    <td>${sf(s.contratante)}</td>
    <td>${formatarDataBR(s.prazoEmissaoArt)}</td>
    <td><span class="status-badge ${sc}">${sf(statusParaExibir(s.status, perms))}</span></td>
    <td>${sf(s.tecnico_responsavel || '—')}</td>
    <td><div class="table-actions">${a}</div></td>
  `;
  
  return tr;
}

function renderizarNumerosPagina() {
  if (!DOM.paginationNumbers) return;
  
  let h = '';
  const mx = 5;
  let st = Math.max(1, AppState.paginaAtual - Math.floor(mx / 2));
  let en = Math.min(AppState.totalPaginas, st + mx - 1);
  
  if (en - st < mx - 1) st = Math.max(1, en - mx + 1);
  
  for (let i = st; i <= en; i++) {
    h += `<button class="page-number ${i === AppState.paginaAtual ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  
  DOM.paginationNumbers.innerHTML = h;
  
  DOM.paginationNumbers.querySelectorAll('.page-number').forEach(b => {
    b.addEventListener('click', () => {
      AppState.paginaAtual = parseInt(b.dataset.page);
      renderizarTabela();
    });
  });
  
  if (DOM.btnFirst) DOM.btnFirst.disabled = AppState.paginaAtual === 1;
  if (DOM.btnPrev) DOM.btnPrev.disabled = AppState.paginaAtual === 1;
  if (DOM.btnNext) DOM.btnNext.disabled = AppState.paginaAtual === AppState.totalPaginas;
  if (DOM.btnLast) DOM.btnLast.disabled = AppState.paginaAtual === AppState.totalPaginas;
}

// ========== KPIs ==========
function atualizarKPIs() {
  // Usa o mesmo filtro de perfil da tabela — Equipe ADM vê apenas os seus
  const dados = getSolicitacoesDoUsuario(AppState.solicitacoes);

  const counts = {
    Total: dados.length,
    Fila: dados.filter(s => s.status === 'Na fila').length,
    Processando: dados.filter(s => s.status === 'Processando' || s.status === 'Rascunho Reprovado').length,
    Rascunho: dados.filter(s => s.status === 'Rascunho Pendente').length,
    Ajuste: dados.filter(s => s.status === 'Ajuste Pendente').length,
    Pagamento: dados.filter(s => s.status === 'Pagamento Programado').length,
    Pago: dados.filter(s => s.status === 'Pago').length,
    ArtAssinada: dados.filter(s => s.status === 'ART Assinada').length,
    Finalizado: dados.filter(s => s.status === 'Finalizado').length,
    BaixaSolicitada: dados.filter(s => s.status === 'Baixa Solicitada').length,
    Baixa: dados.filter(s => s.status === 'Baixa da ART').length
  };

  Object.entries(counts).forEach(([k, v]) => {
    const el = DOM.kpis[k];
    if (el) el.textContent = v;
  });
}


// ✅ NOVO: Atualizar notificações para financeiro
function atualizarNotificacoesFinanceiro() {
  if (!DOM.notificacoesFinanceiro || !DOM.badgePagamentosPendentes || !DOM.listaPagamentosPendentes) return;
  
  // Só exibe para financeiro logado
  if (AppState.usuarioAtual?.tipo !== 'financeiro') {
    DOM.notificacoesFinanceiro.classList.add('hidden');
    return;
  }
  
  // Filtra solicitações com status "Pagamento Programado" e encaminhar_financeiro = true
  const pendentes = AppState.solicitacoes.filter(s => 
    s.status === 'Pagamento Programado' && s.encaminhar_financeiro === true
  );
  
  if (pendentes.length === 0) {
    DOM.notificacoesFinanceiro.classList.add('hidden');
    return;
  }
  
  // Atualiza badge
  DOM.badgePagamentosPendentes.textContent = pendentes.length;
  DOM.notificacoesFinanceiro.classList.remove('hidden');
  
  // Lista os itens
  DOM.listaPagamentosPendentes.innerHTML = pendentes.slice(0, 5).map(s =>
    `<div class="notification-item">
      <strong>${escapeHtml(s.solicitacao_id)}</strong><br>
      <small>${escapeHtml(s.contratante)} • ${formatarMoedaBR(s.valor)}</small>
    </div>`
  ).join('');
  
  if (pendentes.length > 5) {
    DOM.listaPagamentosPendentes.innerHTML += `<div style="padding: 0.25rem 0; color: var(--text-muted); font-size: 0.8rem;">+ ${pendentes.length - 5} mais...</div>`;
  }
}

// ========== MODAIS ==========
async function verDetalhes(id) {
  const s = AppState.solicitacoes.find(x => x.solicitacao_id === id);
  if (!s) return;
  
  const mt = document.getElementById('modalTitle');
  const mb = document.getElementById('modalBody');
  const mf = document.getElementById('modalFooter');
  
  if (mt) mt.textContent = `Detalhes – ${s.solicitacao_id} (${s.tipo})`;
  const sf = str => escapeHtml(str || '—');

  // ── Identificação ──────────────────────────────────────────
  let h = `
    <div class="detail-section-title">📌 Identificação da Solicitação</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Solicitante</span><span class="detail-value">${sf(s.solicitante)}</span></div>
      <div class="detail-item"><span class="detail-label">Data da Solicitação</span><span class="detail-value">${formatarDataBR(s.dataSolicitacao)}</span></div>
      <div class="detail-item"><span class="detail-label">Prazo de Emissão da ART</span><span class="detail-value">${formatarDataBR(s.prazoEmissaoArt)}</span></div>
      <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${statusClassParaExibir(s.status, getPermissoes())}">${sf(statusParaExibir(s.status, getPermissoes()))}</span></span></div>
    </div>

    <!-- ── Informações do Projeto ── -->
    <div class="detail-section-title">📋 Informações do Projeto</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Nome do Empreendimento</span><span class="detail-value">${sf(s.nomeEmpreendimento)}</span></div>
      <div class="detail-item"><span class="detail-label">Código Clockify</span><span class="detail-value">${sf(s.codigoClockfy)}</span></div>
      <div class="detail-item"><span class="detail-label">Rascunho da ART para validação?</span><span class="detail-value">${s.rascunho_art === 'sim' ? '✔ Sim' : s.rascunho_art === 'nao' ? 'Não' : '—'}</span></div>
    </div>

    <!-- ── Técnico ── -->
    <div class="detail-section-title">🔧 Técnico Responsável</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Nome do Técnico</span><span class="detail-value">${sf(s.nomeTecnico)}</span></div>
      <div class="detail-item"><span class="detail-label">Estado (UF)</span><span class="detail-value">${sf(s.estado)}</span></div>
      ${s.tecnico_responsavel ? `<div class="detail-item"><span class="detail-label">Atribuído</span><span class="detail-value">${sf(s.tecnico_responsavel)}</span></div>` : ''}
      ${s.outrosTecnicoNome ? `<div class="detail-item full-width"><span class="detail-label">Outro Técnico</span><span class="detail-value">${sf(s.outrosTecnicoNome)}</span></div>` : ''}
      ${s.outrosTecnicoJustificativa ? `<div class="detail-item full-width"><span class="detail-label">Justificativa (Outro Técnico)</span><span class="detail-value">${sf(s.outrosTecnicoJustificativa)}</span></div>` : ''}
    </div>`;

  // ── Vínculo ACMB (CRBio) ───────────────────────────────────
  if (s.tipo === 'CRBio') {
    h += `
    <div class="detail-section-title">🔗 Vínculo ACMB</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Vinculado à ACMB?</span><span class="detail-value">${(s.vinculado_acmb || s.vinculadoACMB) === 'sim' ? 'Sim' : 'Não'}</span></div>
    </div>`;
  }

  // ── Dados do Contratante ───────────────────────────────────
  h += `
    <div class="detail-section-title">🏢 Dados do Contratante</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Nome do Contratante</span><span class="detail-value">${sf(s.contratante)}</span></div>
      <div class="detail-item"><span class="detail-label">CNPJ</span><span class="detail-value">${sf(s.cnpj)}</span></div>
      <div class="detail-item"><span class="detail-label">E-mail</span><span class="detail-value">${sf(s.email)}</span></div>
      <div class="detail-item"><span class="detail-label">Contato</span><span class="detail-value">${sf(s.contato)}</span></div>
    </div>

    <!-- ── Endereços ── -->
    <div class="detail-section-title">📍 Endereços</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Endereço do Contratante</span><span class="detail-value">${sf(s.endereco)}, ${sf(s.bairro)} – CEP ${sf(s.cep)}</span></div>
      <div class="detail-item full-width"><span class="detail-label">Endereço da Obra</span><span class="detail-value">${sf(s.enderecoObra)}, ${sf(s.bairroObra)} – CEP ${sf(s.cepObra)}</span></div>
      ${s.latitude ? `<div class="detail-item"><span class="detail-label">Latitude</span><span class="detail-value">${sf(s.latitude)}</span></div>` : ''}
      ${s.longitude ? `<div class="detail-item"><span class="detail-label">Longitude</span><span class="detail-value">${sf(s.longitude)}</span></div>` : ''}
    </div>`;

  // ── Dados Ambientais (CRBio) ───────────────────────────────
  if (s.tipo === 'CRBio') {
    h += `
    <div class="detail-section-title">🌿 Dados Ambientais</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Localidade</span><span class="detail-value">${sf(s.localidade)}</span></div>
      <div class="detail-item"><span class="detail-label">Formato de Execução</span><span class="detail-value">${sf(s.formatoExecucao)}</span></div>
      <div class="detail-item"><span class="detail-label">Meio Ambiente e Biodiversidade</span><span class="detail-value">${sf(s.meioAmbiente)}</span></div>
      <div class="detail-item full-width"><span class="detail-label">Descrição Sumária</span><span class="detail-value">${sf(s.descricaoSumaria)}</span></div>
    </div>`;
  }

  // ── Dados do Projeto ──────────────────────────────────────
  h += `
    <div class="detail-section-title">📅 Dados do Projeto</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Data de Início</span><span class="detail-value">${formatarDataBR(s.dataInicio)}</span></div>
      <div class="detail-item"><span class="detail-label">Data de Fim</span><span class="detail-value">${formatarDataBR(s.dataFim)}</span></div>
      <div class="detail-item"><span class="detail-label">Horas do Projeto</span><span class="detail-value">${sf(s.qtdHoras)}</span></div>
      <div class="detail-item"><span class="detail-label">Valor do Projeto</span><span class="detail-value">${formatarMoedaBR(s.valor)}</span></div>
      <div class="detail-item full-width"><span class="detail-label">Equipe do Projeto</span><span class="detail-value">${sf(s.equipe)}</span></div>
    </div>`;

  // ── Atividades CREA ────────────────────────────────────────
  if (s.tipo === 'CREA' && s.atividades && s.atividades.length > 0) {
    h += `<div class="detail-section-title">🛠️ Atividades CREA</div>`;
    s.atividades.forEach((att, i) => {
      h += `
      <div class="atividade-detail-card">
        <div class="atividade-detail-num">Atividade ${i + 1}</div>
        <div class="atividade-detail-row"><span class="detail-label">Nível</span><span class="detail-value">${sf(att.nivel)}</span></div>
        <div class="atividade-detail-row"><span class="detail-label">Atividade Profissional</span><span class="detail-value">${sf(att.atividadeProfissional)}</span></div>
        <div class="atividade-detail-row"><span class="detail-label">Descrição do Serviço</span><span class="detail-value">${sf(att.descricaoServico)}</span></div>
      </div>`;
    });
  }

  // ── Arquivos Finais ────────────────────────────────────────
  h += `
    <div class="detail-section-title">📁 Arquivos Finais</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Pasta Geral de ARTs</span><span class="detail-value"><a href="https://setegadministrador.sharepoint.com/:u:/r/sites/ADMINISTRATIVOSETEG-GESTAOART/SitePages/Home.aspx?csf=1&web=1&e=w5QSvR" target="_blank" rel="noopener" class="detail-link">Gestão de ARTs – ADMINISTRATIVO SETEG</a></span></div>
      ${s.localArtEspecifica ? `<div class="detail-item full-width"><span class="detail-label">Local Específico da ART</span><span class="detail-value"><a href="${escapeHtml(s.localArtEspecifica)}" target="_blank" rel="noopener" class="detail-link">${escapeHtml(s.localArtEspecifica)}</a></span></div>` : '<div class="detail-item full-width"><span class="detail-label">Local Específico da ART</span><span class="detail-value" style="color:var(--text-muted,#666)">Não preenchido pelo líder</span></div>'}
      ${s.obsDocumentos ? `<div class="detail-item full-width"><span class="detail-label">Observações sobre Documentos</span><span class="detail-value">${sf(s.obsDocumentos)}</span></div>` : ''}
    </div>`;

  if (s.observacoes) {
    h += `
    <div class="detail-section-title">💬 Observações Gerais</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-value" style="white-space:pre-wrap;">${sf(s.observacoes)}</span></div>
    </div>`;
  }
  
  const hist = await carregarHistoricoDB(id);
  h += `<div class="history-timeline"><div class="history-title">📜 Histórico</div>`;
  hist.forEach(x => {
    h += `<div class="history-item">
      <div class="history-date">${formatarDataHoraBR(x.created_at)}</div>
      <div class="history-user">${sf(x.usuario_nome)} (${x.usuario_tipo})</div>
      <div class="history-action">${sf(x.acao)}${x.detalhes ? ' – ' + sf(x.detalhes) : ''}</div>
    </div>`;
  });

  // Entrada fixa de criação — sempre aparece por último
  const diaCriacao = s.dataSolicitacao
    ? new Date(s.dataSolicitacao + 'T00:00:00').toLocaleDateString('pt-BR', {
        timeZone: CONFIG.TIMEZONE,
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '—';
  h += `<div class="history-item history-item-criacao">
    <div class="history-date">${diaCriacao}</div>
    <div class="history-user">${sf(s.solicitante)}</div>
    <div class="history-action">Solicitação criada</div>
  </div>`;

  h += `</div>`;
  
  if (mb) mb.innerHTML = h;
  
  let ft = `<button class="btn btn-ghost" onclick="fecharModal(event)">Fechar</button>`;
  const perms = getPermissoes();
  if (perms.tipoAdmin) {
    ft += `<button class="btn btn-primary" onclick="fecharModal(event);abrirEditModal('${s.solicitacao_id}')">Atribuir Técnico</button>`;
    ft += `<button class="btn btn-primary" onclick="fecharModal(event);abrirModalStatus('${s.solicitacao_id}')">Alterar Status</button>`;
  }
  if (perms.tipoTecnico) {
    const statusAtivos = !['Pagamento Programado','Finalizado','Pago','ART Assinada','Baixa Solicitada','Baixa da ART'].includes(s.status);
    if (statusAtivos && perms.podeEncaminharFinanceiro) {
      ft += `<button class="btn btn-secondary" onclick="fecharModal(event);encaminharAoFinanceiro('${s.solicitacao_id}')">${ICONS.encaminhar} Enc. Financeiro</button>`;
    }
    if (s.rascunho_art === 'sim' && ['Processando', 'Rascunho Reprovado'].includes(s.status)) {
      ft += `<button class="btn btn-primary" onclick="fecharModal(event);enviarRascunho('${s.solicitacao_id}')">${ICONS.enviarRascunho} Enviar Rascunho</button>`;
    }
    if (!['Finalizado','Baixa Solicitada','Baixa da ART','Rascunho Pendente','Rascunho Reprovado'].includes(s.status)) {
      ft += `<button class="btn btn-success" onclick="fecharModal(event);finalizarSolicitacao('${s.solicitacao_id}')">${ICONS.finalizar} Finalizar</button>`;
      ft += `<button class="btn btn-warning" onclick="fecharModal(event);abrirAjusteModal('${s.solicitacao_id}')">${ICONS.ajuste} Solicitar Ajuste</button>`;
    }
    if (s.status === 'Baixa Solicitada') {
      ft += `<button class="btn btn-primary" onclick="fecharModal(event);confirmarBaixaART('${s.solicitacao_id}')">${ICONS.confirmarBaixa} Confirmar Baixa da ART</button>`;
    }
  }
  if ((perms.tipoAdmin || perms.tipoSolicitante) && s.status === 'Processando') {
    ft += `<button class="btn btn-warning" onclick="fecharModal(event);abrirAjusteModal('${s.solicitacao_id}')">${ICONS.ajuste} Solicitar Ajuste</button>`;
  }
  if ((perms.tipoSolicitante || perms.tipoAdmin) && s.status === 'Ajuste Pendente') {
    ft += `<button class="btn btn-success" onclick="fecharModal(event);ajusteRealizado('${s.solicitacao_id}')">${ICONS.finalizar} Ajuste Realizado</button>`;
  }
  if ((perms.tipoSolicitante || perms.tipoAdmin) && s.status === 'Rascunho Pendente') {
    ft += `<button class="btn btn-success" onclick="fecharModal(event);aprovarRascunho('${s.solicitacao_id}')">${ICONS.aprovarRascunho} Aprovar Rascunho</button>`;
    ft += `<button class="btn btn-danger" onclick="fecharModal(event);abrirReprovarRascunhoModal('${s.solicitacao_id}')">${ICONS.reprovarRascunho} Reprovar Rascunho</button>`;
  }
  if (perms.tipoFinanceiro && s.status === 'Pagamento Programado') {
    if (s.tipo === 'CREA') {
      ft += `<button class="btn btn-success" onclick="fecharModal(event);pagarSolicitacao('${s.solicitacao_id}')">${ICONS.pagar} Pago</button>`;
    } else {
      ft += `<button class="btn btn-success" onclick="fecharModal(event);assinarArt('${s.solicitacao_id}')">${ICONS.assinar} ART Assinada</button>`;
    }
  }

  // Baixa disponível para qualquer pessoa quando status = Finalizado
  if (s.status === 'Finalizado' && !s.baixa_solicitada) {
    ft += `<button class="btn btn-secondary" onclick="fecharModal(event);abrirBaixaModal('${s.solicitacao_id}')">${ICONS.baixa} Solicitar Baixa da ART</button>`;
  }

  if (mf) mf.innerHTML = ft;
  if (DOM.modalOverlay) DOM.modalOverlay.classList.add('active');
}

// ✅ FUNÇÃO CORRIGIDA PARA FECHAR MODAL
function fecharModal(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  
  // Limpa o conteúdo após animação
  setTimeout(() => {
    const modalBody = document.getElementById('modalBody');
    if (modalBody) modalBody.innerHTML = '';
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) modalFooter.innerHTML = '';
  }, 300);
}

// ✅ FUNÇÕES DE FECHAMENTO DOS OUTROS MODAIS (corrigidas)
function fecharStatusModal(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const overlay = document.getElementById('statusModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

function fecharEditModal(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const overlay = document.getElementById('editModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

function fecharAjusteModal(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const overlay = document.getElementById('ajusteModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

function fecharBaixaModal(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const overlay = document.getElementById('baixaModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

// ========== FUNÇÕES AUXILIARES ==========
function abrirEditModal(id) {
  const mb = document.getElementById('editModalBody');
  const mf = document.getElementById('editModalFooter');
  const s = AppState.solicitacoes.find(x => x.solicitacao_id === id);
  if (!s) return;
  
  if (mb) mb.innerHTML = `
    <div class="form-group">
      <label class="form-label">Técnico Responsável</label>
      <select class="form-control" id="editTecnicoSelect">
        <option value="">Selecione...</option>
        <option value="Kevilla" ${s.tecnico_responsavel === 'Kevilla' ? 'selected' : ''}>Kevilla</option>
        <option value="Henrique" ${s.tecnico_responsavel === 'Henrique' ? 'selected' : ''}>Henrique</option>
      </select>
    </div>
  `;
  
  if (mf) mf.innerHTML = `
    <button class="btn btn-ghost" onclick="fecharEditModal(event)">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarAtribuicao('${s.solicitacao_id}')">Salvar</button>
  `;
  
  if (DOM.editModalOverlay) DOM.editModalOverlay.classList.add('active');
}

async function salvarAtribuicao(id) {
  const tecnico = document.getElementById('editTecnicoSelect')?.value;
  if (!tecnico) {
    showToast('Selecione um técnico.', 'error');
    return;
  }
  
  try {
    await atualizarSolicitacaoDB(id, { tecnico_responsavel: tecnico, status: 'Processando' });
    await adicionarHistoricoDB(id, 'Atribuição', `Técnico: ${tecnico}`);
    showToast('Técnico atribuído com sucesso!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharEditModal();
  } catch(e) {
    console.error('Erro ao atribuir:', e);
    showToast('Erro ao atribuir técnico.', 'error');
  }
}

// ✅ ATUALIZADO: Limitar opções de status por perfil
function abrirModalStatus(id) {
  const mb = document.getElementById('statusModalBody');
  const mf = document.getElementById('statusModalFooter');
  const s = AppState.solicitacoes.find(x => x.solicitacao_id === id);
  if (!s) return;
  
  const perms = getPermissoes();
  // ✅ NOVO: Usar status permitidos por perfil
  const statusList = perms.statusPermitidos || ['Na fila', 'Processando', 'Ajuste Pendente', 'Pagamento Programado', 'Pago', 'ART Assinada', 'Finalizado', 'Baixa Solicitada', 'Baixa da ART'];
  
  if (mb) mb.innerHTML = `
    <div class="form-group">
      <label class="form-label">Novo Status</label>
      <select class="form-control" id="statusSelect">
        ${statusList.map(st => `<option value="${st}" ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
      </select>
    </div>
  `;
  
  if (mf) mf.innerHTML = `
    <button class="btn btn-ghost" onclick="fecharStatusModal(event)">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarStatus('${s.solicitacao_id}')">Salvar</button>
  `;
  
  if (DOM.statusModalOverlay) DOM.statusModalOverlay.classList.add('active');
}

// ✅ ATUALIZADO: Flaggar notificação ao financeiro quando técnico marca "Pagamento Programado"
async function salvarStatus(id) {
  const novoStatus = document.getElementById('statusSelect')?.value;
  if (!novoStatus) {
    showToast('Selecione um status.', 'error');
    return;
  }
  
  try {
    const updateData = { status: novoStatus };
    
    // ✅ NOVO: Quando técnico marca "Pagamento Programado", notifica financeiro
    if (AppState.usuarioAtual?.tipo === 'tecnico' && novoStatus === 'Pagamento Programado') {
      updateData.encaminhar_financeiro = true;
    }
    
    // ✅ NOVO: Quando status muda para "Finalizado", resetar flag de baixa solicitada para permitir nova solicitação
    if (novoStatus === 'Finalizado') {
      updateData.baixa_solicitada = false;
    }
    
    await atualizarSolicitacaoDB(id, updateData);
    await adicionarHistoricoDB(id, 'Alteração de Status', `Para: ${novoStatus}`);
    showToast('Status atualizado!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharStatusModal();
  } catch(e) {
    console.error('Erro ao atualizar status:', e);
    showToast('Erro ao atualizar status.', 'error');
  }
}

function abrirAjusteModal(id) {
  const mb = document.getElementById('ajusteModalBody');
  const mf = document.getElementById('ajusteModalFooter');
  const s = AppState.solicitacoes.find(x => x.solicitacao_id === id);
  if (!s) return;
  
  if (mb) mb.innerHTML = `
    <div class="form-group">
      <label class="form-label">Descrição do Ajuste</label>
      <textarea class="form-control" id="ajusteDescricao" rows="3" placeholder="Descreva o ajuste necessário..." required></textarea>
    </div>
  `;
  
  if (mf) mf.innerHTML = `
    <button class="btn btn-ghost" onclick="fecharAjusteModal(event)">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarAjuste('${s.solicitacao_id}')">Solicitar</button>
  `;
  
  if (DOM.ajusteModalOverlay) DOM.ajusteModalOverlay.classList.add('active');
}

async function salvarAjuste(id) {
  const descricao = document.getElementById('ajusteDescricao')?.value?.trim();
  if (!descricao) {
    showToast('Descreva o ajuste necessário.', 'error');
    return;
  }

  try {
    const sol = AppState.solicitacoes.find(x => x.solicitacao_id === id);
    const nomeOverride = !AppState.usuarioAtual ? (sol?.solicitante || 'Solicitante') : null;
    const tipoOverride = !AppState.usuarioAtual ? 'solicitante' : null;
    await atualizarSolicitacaoDB(id, { status: 'Ajuste Pendente', ajuste_descricao: descricao });
    await adicionarHistoricoDB(id, 'Ajuste Solicitado', descricao, nomeOverride, tipoOverride);
    showToast('Ajuste solicitado com sucesso!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharAjusteModal();
  } catch(e) {
    console.error('Erro ao solicitar ajuste:', e);
    showToast('Erro ao solicitar ajuste.', 'error');
  }
}

async function ajusteRealizado(id) {
  try {
    const sol = AppState.solicitacoes.find(x => x.solicitacao_id === id);
    const nome = AppState.usuarioAtual?.nome || sol?.solicitante || 'Solicitante';
    const tipo = AppState.usuarioAtual?.tipo || 'solicitante';
    await atualizarSolicitacaoDB(id, { status: 'Na fila', ajuste_descricao: null });
    await adicionarHistoricoDB(id, 'Ajuste Realizado', 'Solicitante confirmou que o ajuste foi feito', nome, tipo);
    showToast('Ajuste marcado como realizado. Solicitação voltou para a fila.', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao confirmar ajuste:', e);
    showToast('Erro ao confirmar ajuste realizado.', 'error');
  }
}

// ✅ ATUALIZADO: Modal de baixa agora inclui "Nome do Solicitante"
function abrirBaixaModal(id) {
  const mb = document.getElementById('baixaModalBody');
  const mf = document.getElementById('baixaModalFooter');
  const s = AppState.solicitacoes.find(x => x.solicitacao_id === id);
  if (!s) return;
  
  if (mb) mb.innerHTML = `
    <div class="form-group">
      <label class="form-label required">Nome do Solicitante</label>
      <input type="text" class="form-control" id="baixaSolicitante" required placeholder="Quem está solicitando a baixa?">
    </div>
    <div class="form-group">
      <label class="form-label required">Data da Baixa</label>
      <input type="date" class="form-control" id="baixaData" required>
    </div>
    <div class="form-group">
      <label class="form-label required">Motivo da Baixa</label>
      <textarea class="form-control" id="baixaMotivo" rows="3" placeholder="Informe o motivo..." required></textarea>
    </div>
  `;
  
  if (mf) mf.innerHTML = `
    <button class="btn btn-ghost" onclick="fecharBaixaModal(event)">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarBaixa('${s.solicitacao_id}')">Solicitar Baixa</button>
  `;
  
  if (DOM.baixaModalOverlay) DOM.baixaModalOverlay.classList.add('active');
}

// ✅ CORREÇÃO: Agora salva como "Baixa Solicitada" e inclui o nome do solicitante
async function salvarBaixa(id) {
  const solicitante = document.getElementById('baixaSolicitante')?.value?.trim();
  const motivo = document.getElementById('baixaMotivo')?.value?.trim();
  const data = document.getElementById('baixaData')?.value;
  
  if (!solicitante || !motivo || !data) {
    showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }
  
  try {
    await atualizarSolicitacaoDB(id, { 
      status: 'Baixa Solicitada',  // ✅ ALTERADO: Era 'Baixa da ART', agora é 'Baixa Solicitada'
      baixa_solicitada: true, 
      motivo_baixa: motivo, 
      data_baixa: data,
      baixa_solicitante: solicitante // ✅ NOVO: Salva o nome do solicitante
    });
    await adicionarHistoricoDB(id, 'Baixa Solicitada', motivo, solicitante, 'solicitante');
    showToast('Baixa solicitada! Técnico responsável será notificado.', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharBaixaModal();
  } catch(e) {
    console.error('Erro ao solicitar baixa:', e);
    showToast('Erro ao solicitar baixa.', 'error');
  }
}

// ========== MODAL DE CONFIRMAÇÃO CUSTOMIZADO ==========
let confirmResolve = null;

function confirmarAcao(mensagem, titulo = 'Confirmação') {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    const overlay = document.getElementById('confirmModalOverlay');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    
    if (titleEl) titleEl.textContent = titulo;
    if (msgEl) msgEl.textContent = mensagem;
    if (overlay) overlay.classList.add('active');
  });
}

function fecharConfirmModal() {
  const overlay = document.getElementById('confirmModalOverlay');
  if (overlay) overlay.classList.remove('active');
  // Resolve como false apenas se ainda estiver pendente
  if (confirmResolve) {
    confirmResolve(false);
    confirmResolve = null;
  }
}

function confirmarAcaoOk() {
  // ✅ Resolve como TRUE ANTES de fechar a UI (Bug corrigido)
  if (confirmResolve) {
    const res = confirmResolve;
    confirmResolve = null;
    res(true);
  }
  fecharConfirmModal();
}

function confirmarAcaoCancel() {
  fecharConfirmModal(); // Já resolve como false e fecha UI
}

// ========== AÇÕES CRÍTICAS ==========

// ✅ NOVO: Função para técnico encaminhar ao financeiro (COM MODAL CUSTOMIZADO)
async function encaminharAoFinanceiro(id) {
  try {
    await atualizarSolicitacaoDB(id, {
      status: 'Pagamento Programado',
      encaminhar_financeiro: true
    });
    const nomeEnviador = AppState.usuarioAtual?.nome || 'Equipe ADM';
    await adicionarHistoricoDB(id, 'Encaminhado ao Financeiro', `Enviado por ${nomeEnviador}`);
    showToast('Encaminhado ao financeiro com sucesso!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao encaminhar:', e);
    showToast('Erro ao encaminhar ao financeiro.', 'error');
  }
}

async function finalizarSolicitacao(id) {
  try {
    await atualizarSolicitacaoDB(id, { status: 'Finalizado' });
    await adicionarHistoricoDB(id, 'Finalizado', `Finalizado por ${AppState.usuarioAtual?.nome || 'Técnico'}`);
    showToast('Solicitação finalizada!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    showToast('Erro ao finalizar.', 'error');
  }
}

async function confirmarBaixaART(id) {
  try {
    await atualizarSolicitacaoDB(id, { status: 'Baixa da ART' });
    await adicionarHistoricoDB(id, 'Baixa da ART', `Baixa confirmada por ${AppState.usuarioAtual?.nome || 'Técnico'}`);
    showToast('Baixa da ART confirmada!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao confirmar baixa:', e);
    showToast('Erro ao confirmar baixa da ART.', 'error');
  }
}

async function pagarSolicitacao(id) {
  try {
    await atualizarSolicitacaoDB(id, { status: 'Pago' });
    await adicionarHistoricoDB(id, 'Pago', `Pago por ${AppState.usuarioAtual?.nome || 'Financeiro'}`);
    showToast('Marcado como Pago!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    showToast('Erro ao registrar pagamento.', 'error');
  }
}

async function assinarArt(id) {
  try {
    await atualizarSolicitacaoDB(id, { status: 'ART Assinada' });
    await adicionarHistoricoDB(id, 'ART Assinada', `Assinada por ${AppState.usuarioAtual?.nome || 'Financeiro'}`);
    showToast('ART marcada como Assinada!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    showToast('Erro ao registrar assinatura da ART.', 'error');
  }
}

async function enviarRascunho(id) {
  try {
    await atualizarSolicitacaoDB(id, { status: 'Rascunho Pendente' });
    await adicionarHistoricoDB(id, 'Rascunho Pendente', `Rascunho enviado para aprovação por ${AppState.usuarioAtual?.nome || 'Técnico'}`);
    showToast('Rascunho enviado para aprovação!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao enviar rascunho:', e);
    showToast('Erro ao enviar rascunho para aprovação.', 'error');
  }
}

async function aprovarRascunho(id) {
  try {
    await atualizarSolicitacaoDB(id, { status: 'Processando' });
    await adicionarHistoricoDB(id, 'Rascunho Aprovado', `Rascunho aprovado por ${AppState.usuarioAtual?.nome || 'Solicitante'}`);
    showToast('Rascunho aprovado! Técnico pode continuar.', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao aprovar rascunho:', e);
    showToast('Erro ao aprovar rascunho.', 'error');
  }
}

function abrirReprovarRascunhoModal(id) {
  const s = AppState.solicitacoes.find(x => x.solicitacao_id === id);
  if (!s) return;
  const mb = document.getElementById('reprovarRascunhoModalBody');
  const mf = document.getElementById('reprovarRascunhoModalFooter');
  if (mb) mb.innerHTML = `
    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.8rem;">
      O técnico receberá a reprovação com a justificativa e poderá emitir um novo rascunho com as alterações solicitadas.
    </p>
    <div class="form-group">
      <label class="form-label">Justificativa da Reprovação <span style="color:var(--orange)">*</span></label>
      <textarea class="form-control" id="reprovarJustificativa" rows="4"
        placeholder="Descreva as alterações necessárias para o rascunho..."></textarea>
    </div>`;
  if (mf) mf.innerHTML = `
    <button class="btn btn-ghost" onclick="fecharReprovarRascunhoModal(event)">Cancelar</button>
    <button class="btn btn-danger" onclick="salvarReprovacaoRascunho('${s.solicitacao_id}')">${ICONS.reprovarRascunho} Reprovar</button>`;
  if (DOM.reprovarRascunhoModalOverlay) DOM.reprovarRascunhoModalOverlay.classList.add('active');
}

function fecharReprovarRascunhoModal(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  DOM.reprovarRascunhoModalOverlay?.classList.remove('active');
}

async function salvarReprovacaoRascunho(id) {
  const justificativa = document.getElementById('reprovarJustificativa')?.value?.trim();
  if (!justificativa) {
    showToast('Informe a justificativa da reprovação.', 'error');
    return;
  }
  try {
    await atualizarSolicitacaoDB(id, { status: 'Rascunho Reprovado', rascunho_justificativa: justificativa });
    await adicionarHistoricoDB(id, 'Rascunho Reprovado', justificativa);
    showToast('Rascunho reprovado. Técnico foi notificado para revisão.', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharReprovarRascunhoModal();
  } catch(e) {
    console.error('Erro ao reprovar rascunho:', e);
    showToast('Erro ao reprovar rascunho.', 'error');
  }
}

async function excluirSolicitacao(id) {
  const confirmou = await confirmarAcao(
    'Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.',
    'Excluir Solicitação'
  );
  if (!confirmou) return;

  // Exclusão local imediata (sempre)
  const _excluirLocal = () => {
    const cache = lsGet(LS.CACHE, []);
    const nova = cache.filter(s => s.solicitacao_id !== id);
    lsSet(LS.CACHE, nova);
    AppState.solicitacoes = nova;
    renderizarTabela();
    atualizarKPIs();
  };

  if (!_sb) {
    _excluirLocal();
    showToast('Solicitação removida localmente.', 'info');
    return;
  }

  try {
    const { error } = await _sb
      .from('solicitacoes')
      .delete()
      .eq('solicitacao_id', id);

    if (error) throw error;

    _excluirLocal();
    showToast('Solicitação excluída!', 'success');
  } catch(e) {
    console.error('Erro ao excluir:', e);
    if (isNetworkError(e)) {
      _excluirLocal();
      enfileirarSync({ tipo: 'excluir', id });
      showToast('Sem conexão — removido localmente. Será sincronizado.', 'info');
    } else if (e.message?.includes('row-level security') || e.message?.includes('permission denied')) {
      showToast('Sem permissão para excluir no banco. Verifique as políticas RLS.', 'error');
    } else {
      showToast(`Erro ao excluir: ${e.message || 'Verifique o console (F12).'}`, 'error');
    }
  }
}

// ========== EVENT LISTENERS ==========
function configurarEventListeners() {
  document.getElementById('btnNovaSolicitacao')?.addEventListener('click', toggleFormulario);
  
  DOM.tipoSolicitacao?.addEventListener('change', function() {
    const t = this.value;
    if (DOM.formCREA) DOM.formCREA.classList.add('hidden');
    if (DOM.formCRBio) DOM.formCRBio.classList.add('hidden');

    if (t === 'CREA') {
      if (DOM.formCREA) DOM.formCREA.classList.remove('hidden');
      if (!DOM.atividadesCREAContainer?.querySelector('.atividade-card')) {
        adicionarAtividadeCREA();
      }
    } else if (t === 'CRBio') {
      if (DOM.formCRBio) DOM.formCRBio.classList.remove('hidden');
    }

    definirMinPrazoEmissao();

    // dataSolicitacao é salvo automaticamente ao submeter, não é campo visível
  });
  
  DOM.artForm?.addEventListener('submit', e => {
    e.preventDefault();
    salvarSolicitacao();
  });
  
  DOM.artForm?.addEventListener('reset', () => {
    setTimeout(() => {
      document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
      limparAtividadesCREA();
      const outrosContainer = document.getElementById('outrosTecnicoContainerCREA');
      if (outrosContainer) outrosContainer.classList.add('hidden');
      ['CREA', 'CRBIO'].forEach(t => {
        const l = document.getElementById(`linkAbrirArt${t}`);
        if (l) { l.href = '#'; l.classList.add('hidden'); }
      });
    }, 10);
  });
  
  document.querySelector('.filter-pills')?.addEventListener('click', e => {
    const b = e.target.closest('.filter-pill');
    if (!b) return;
    DOM.filterPills.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    AppState.paginaAtual = 1;
    renderizarTabela();
  });
  
  DOM.filterConselho?.addEventListener('change', () => {
    AppState.paginaAtual = 1;
    renderizarTabela();
  });
  
  DOM.filterSetor?.addEventListener('change', () => {
    AppState.paginaAtual = 1;
    renderizarTabela();
  });
  
  DOM.searchInput?.addEventListener('input', e => {
    clearTimeout(AppState.searchDebounceTimer);
    AppState.paginaAtual = 1;
    AppState.searchDebounceTimer = setTimeout(renderizarTabela, CONFIG.DEBOUNCE_MS);
  });
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const formContainer = document.getElementById('formContainer');
      if (formContainer && formContainer.classList.contains('expanded')) {
        fecharFormulario();
      }
      fecharModal();
      fecharStatusModal();
      fecharModalLogin();
      fecharEditModal();
      fecharAjusteModal();
      fecharBaixaModal();
      fecharConfirmModal(); // ✅ NOVO: Fechar modal de confirmação
    }
  });
  
  document.getElementById('senhaAcesso')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });
  
  DOM.artTableBody?.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    const id = b.dataset.id;
    const ac = {
      ver: () => verDetalhes(id),
      atribuir: () => abrirEditModal(id),
      status: () => abrirModalStatus(id),
      excluir: () => excluirSolicitacao(id),
      ajuste: () => abrirAjusteModal(id),
      'ajuste-realizado': () => ajusteRealizado(id),
      baixa: () => abrirBaixaModal(id),
      // ✅ NOVO: Ação para técnico encaminhar ao financeiro
      'encaminhar-financeiro': () => encaminharAoFinanceiro(id),
      'finalizar': () => finalizarSolicitacao(id),
      'confirmar-baixa': () => confirmarBaixaART(id),
      'pagar': () => pagarSolicitacao(id),
      'assinar-art': () => assinarArt(id),
      'enviar-rascunho': () => enviarRascunho(id),
      'aprovar-rascunho': () => aprovarRascunho(id),
      'reprovar-rascunho': () => abrirReprovarRascunhoModal(id)
    };
    if (ac[a]) ac[a]();
  });
  
  document.querySelectorAll('.btn-login-header').forEach(b => {
    b.addEventListener('click', () => {
      const tipo = b.dataset.loginType;
      abrirModalLogin(tipo);
    });
  });
  
  DOM.modalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.modalOverlay) fecharModal();
  });
  
  DOM.statusModalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.statusModalOverlay) fecharStatusModal();
  });
  
  DOM.editModalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.editModalOverlay) fecharEditModal();
  });
  
  DOM.loginModal?.addEventListener('click', e => {
    if (e.target === DOM.loginModal) fecharModalLogin();
  });
  
  DOM.ajusteModalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.ajusteModalOverlay) fecharAjusteModal();
  });
  
  DOM.baixaModalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.baixaModalOverlay) fecharBaixaModal();
  });

  DOM.reprovarRascunhoModalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.reprovarRascunhoModalOverlay) fecharReprovarRascunhoModal();
  });

  // ✅ NOVO: Fechar modal de confirmação ao clicar fora
  const confirmOverlay = document.getElementById('confirmModalOverlay');
  if (confirmOverlay) {
    confirmOverlay.addEventListener('click', e => {
      if (e.target === confirmOverlay) fecharConfirmModal();
    });
  }
  
  DOM.btnFirst?.addEventListener('click', () => { AppState.paginaAtual = 1; renderizarTabela(); });
  DOM.btnPrev?.addEventListener('click', () => { if (AppState.paginaAtual > 1) { AppState.paginaAtual--; renderizarTabela(); } });
  DOM.btnNext?.addEventListener('click', () => { if (AppState.paginaAtual < AppState.totalPaginas) { AppState.paginaAtual++; renderizarTabela(); } });
  DOM.btnLast?.addEventListener('click', () => { AppState.paginaAtual = AppState.totalPaginas; renderizarTabela(); });
  
  DOM.perPageSelect?.addEventListener('change', e => {
    AppState.itensPorPagina = parseInt(e.target.value);
    AppState.paginaAtual = 1;
    renderizarTabela();
  });
  
  DOM.btnAddAtividadeCREA?.addEventListener('click', adicionarAtividadeCREA);

  // Clockify: autocomplete customizado com debounce
  configurarClockifyAutocomplete();
}

function normalizar(str) {
  return (str || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function filtrarProjetosClockify(texto) {
  const t = normalizar(texto);
  if (t.length < 2) return [];
  return projetosClockify
    .filter(p =>
      normalizar(p._nome).includes(t) ||
      normalizar(p._code).includes(t) ||
      normalizar(p.clientName || '').includes(t) ||
      normalizar(p.name).includes(t)
    )
    .slice(0, 12);
}

function mostrarSugestoesClockify(tipo, projetos, estado) {
  const box = document.getElementById(`clockifySuggestions${tipo}`);
  if (!box) return;

  if (estado === 'loading') {
    box.innerHTML = `<div class="clockify-suggestion-msg">Buscando projetos...</div>`;
  } else if (estado === 'empty') {
    box.innerHTML = `<div class="clockify-suggestion-msg">Nenhum projeto encontrado</div>`;
  } else {
    box.innerHTML = projetos.map(p => {
      const nome = escapeHtml(p._nome);
      const code = escapeHtml(p._code);
      return `<div class="clockify-suggestion-item" data-id="${escapeHtml(p.id)}" data-nome="${nome}" data-code="${code}">
        <span class="suggestion-nome">${nome}</span>
        <span class="suggestion-code">${code}</span>
      </div>`;
    }).join('');
  }
  box.classList.add('active');
}

function esconderSugestoesClockify(tipo) {
  const box = document.getElementById(`clockifySuggestions${tipo}`);
  if (box) box.classList.remove('active');
}

function configurarClockifyAutocomplete() {
  ['CREA', 'CRBio'].forEach(tipo => {
    const nomeField = document.getElementById(`nomeEmpreendimento${tipo}`);
    const codeField = document.getElementById(`codigoClockfy${tipo}`);
    const suggestionsBox = document.getElementById(`clockifySuggestions${tipo}`);
    if (!nomeField || !codeField || !suggestionsBox) return;

    const buscarComDebounce = debounce((texto) => {
      if (!texto.trim() || texto.trim().length < 2) {
        esconderSugestoesClockify(tipo);
        return;
      }
      if (!projetosClockify.length) {
        mostrarSugestoesClockify(tipo, [], 'empty');
        return;
      }
      const resultados = filtrarProjetosClockify(texto);
      if (resultados.length) {
        mostrarSugestoesClockify(tipo, resultados, 'list');
      } else {
        mostrarSugestoesClockify(tipo, [], 'empty');
      }
    }, 400);

    // Digitar: limpa seleção anterior e dispara busca com debounce
    nomeField.addEventListener('input', () => {
      codeField.value = '';
      nomeField.dataset.clockifyId = '';
      nomeField.classList.remove('error');
      codeField.classList.remove('error');
      mostrarSugestoesClockify(tipo, [], 'loading');
      buscarComDebounce(nomeField.value);
    });

    // Clicar em sugestão: preenche os dois campos
    suggestionsBox.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.clockify-suggestion-item');
      if (!item) return;
      e.preventDefault();
      nomeField.value = item.dataset.nome;
      codeField.value = item.dataset.code;
      nomeField.dataset.clockifyId = item.dataset.id;
      nomeField.classList.remove('error');
      codeField.classList.remove('error');
      esconderSugestoesClockify(tipo);
    });

    // Fechar ao perder foco
    nomeField.addEventListener('blur', () => {
      setTimeout(() => esconderSugestoesClockify(tipo), 200);
    });

    // Fechar com Escape
    nomeField.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') esconderSugestoesClockify(tipo);
    });
  });
}

function configurarMascaras() {
  document.querySelectorAll('.mask-cnpj').forEach(i => {
    i.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 14);
      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
      e.target.value = v;
    });
  });
  
  document.querySelectorAll('.mask-cep').forEach(i => {
    i.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
      e.target.value = v;
    });
  });
  
  document.querySelectorAll('.mask-phone').forEach(i => {
    i.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      v = v.replace(/^(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
      e.target.value = v;
    });
  });
  
  document.querySelectorAll('.mask-currency').forEach(i => {
    i.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v === '') { e.target.value = ''; return; }
      v = (parseInt(v) / 100).toFixed(2);
      v = v.replace('.', ',');
      v = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      e.target.value = 'R$ ' + v;
    });
  });
}

// ========== UPPERCASE EM TEMPO REAL ==========
function setupUppercaseInputs() {
  const inputs = document.querySelectorAll('input[type="text"].form-control:not(.mask-cnpj):not(.mask-phone):not(.mask-cep):not(.mask-currency):not([list])');
  
  inputs.forEach(input => {
    input.addEventListener('input', function(e) {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      const value = this.value;
      const upper = value.toUpperCase();
      
      if (value !== upper) {
        this.value = upper;
        this.setSelectionRange(start, end);
      }
    });
  });
}

// ========== INTEGRAÇÃO CLOCKIFY ==========
async function carregarProjetosClockify() {
  try {
    const wsRes = await fetch(`${CLOCKIFY_BASE_URL}/workspaces`, {
      headers: { 'X-Api-Key': CLOCKIFY_API_KEY }
    });
    if (!wsRes.ok) throw new Error(`Erro workspace: ${wsRes.status}`);
    const workspaces = await wsRes.json();
    if (!workspaces.length) throw new Error('Nenhum workspace encontrado');
    const wsId = workspaces[0].id;

    // Pagina igual ao Setegcard para garantir que todos os projetos sejam carregados
    const todos = [];
    for (let page = 1; page < 100; page++) {
      const res = await fetch(
        `${CLOCKIFY_BASE_URL}/workspaces/${wsId}/projects?page=${page}&page-size=200&archived=false`,
        { headers: { 'X-Api-Key': CLOCKIFY_API_KEY } }
      );
      if (!res.ok) throw new Error(`Erro projetos: ${res.status}`);
      const lote = await res.json();
      if (!lote.length) break;
      todos.push(...lote);
      if (lote.length < 200) break;
    }

    // Filtra cancelados/finalizados (mesma convenção do Setegcard)
    const ignorar = /^(CANCELADO|FINALIZADO)/i;
    projetosClockify = todos
      .filter(p => !ignorar.test((p.name || '').trim()))
      .map(p => {
        // Tenta extrair código e nome do formato "#0006-5-2025 (CASA DOS VENTOS)"
        const m = (p.name || '').match(/^(#[^\s(]+)\s*(?:\((.+)\))?$/);
        const code  = m ? m[1] : p.name;
        // Prioridade: nome entre parênteses → clientName → nome completo
        const nome  = (m && m[2] ? m[2].trim() : null)
                   || (p.clientName ? p.clientName.trim() : null)
                   || p.name;
        return { ...p, _code: code, _nome: nome };
      });

    popularSelectsEmpreendimento();
    console.log(`✅ ${projetosClockify.length} projetos Clockify carregados`);
    if (!projetosClockify.length) showToast('Clockify conectado, mas nenhum projeto ativo encontrado.', 'info');
  } catch(e) {
    console.error('Erro ao carregar projetos Clockify:', e);
    showToast('Não foi possível carregar os projetos do Clockify. Verifique a conexão.', 'error');
  }
}

function popularSelectsEmpreendimento() {
  // Datalists removidos — autocomplete customizado cuida do display
}

// ========== TOAST ==========
function showToast(msg, type = 'info') {
  const c = DOM.toastContainer;
  if (!c) return;
  
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  
  const tm = setTimeout(() => {
    t.style.animation = 'toastOut 0.35s ease forwards';
    setTimeout(() => t.remove(), 350);
  }, 3500);
  
  t.style.cursor = 'pointer';
  t.addEventListener('click', () => {
    clearTimeout(tm);
    t.style.animation = 'toastOut 0.35s ease forwards';
    setTimeout(() => t.remove(), 350);
  });
}

// ✅ GARANTIA DE ESCOPO GLOBAL PARA ONCLICK
window.fecharFormulario = fecharFormulario;
window.fazerLogin = fazerLogin;
window.logout = logout;
window.fecharModalLogin = fecharModalLogin;
window.abrirEditModal = abrirEditModal;
window.fecharEditModal = fecharEditModal;
window.abrirModalStatus = abrirModalStatus;
window.fecharStatusModal = fecharStatusModal;
window.abrirAjusteModal = abrirAjusteModal;
window.fecharAjusteModal = fecharAjusteModal;
window.abrirBaixaModal = abrirBaixaModal;
window.fecharBaixaModal = fecharBaixaModal;
window.excluirSolicitacao = excluirSolicitacao;
window.fecharModal = fecharModal;
window.verDetalhes = verDetalhes;
window.consultarTabelaAtividades = consultarTabelaAtividades;
window.toggleSenha = toggleSenha;
window.encaminharAoFinanceiro = encaminharAoFinanceiro;
window.enviarRascunho = enviarRascunho;
window.aprovarRascunho = aprovarRascunho;
window.abrirReprovarRascunhoModal = abrirReprovarRascunhoModal;
window.fecharReprovarRascunhoModal = fecharReprovarRascunhoModal;
window.salvarReprovacaoRascunho = salvarReprovacaoRascunho;
window.toggleOutrosTecnicoCREA = toggleOutrosTecnicoCREA;
window.atualizarLinkArt = atualizarLinkArt;

// DEBUG Clockify — rode no console: debugClockify()
window.debugClockify = async function() {
  console.group('=== DEBUG CLOCKIFY ===');
  console.log('API Key configurada:', CLOCKIFY_API_KEY ? '✅ Sim' : '❌ Não');
  console.log('Projetos em memória:', projetosClockify.length);

  if (projetosClockify.length > 0) {
    console.log('Primeiros 5 projetos (estrutura completa):');
    console.table(projetosClockify.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      code: p.code ?? '(sem code)',
      clientName: p.clientName ?? '(sem cliente)',
      archived: p.archived
    })));
    console.log('Exemplo de projeto completo (raw):', projetosClockify[0]);
  } else {
    console.warn('⚠️ Array vazio — tentando buscar agora...');
    try {
      const wsRes = await fetch(`${CLOCKIFY_BASE_URL}/workspaces`, { headers: { 'X-Api-Key': CLOCKIFY_API_KEY } });
      console.log('Status /workspaces:', wsRes.status, wsRes.statusText);
      const ws = await wsRes.json();
      console.log('Workspaces retornados:', ws);
      if (ws.length) {
        const projRes = await fetch(`${CLOCKIFY_BASE_URL}/workspaces/${ws[0].id}/projects?page=1&page-size=5`, { headers: { 'X-Api-Key': CLOCKIFY_API_KEY } });
        console.log('Status /projects:', projRes.status, projRes.statusText);
        const projs = await projRes.json();
        console.log('Primeiros 5 projetos (raw):', projs);
      }
    } catch(e) {
      console.error('Erro na requisição:', e);
    }
  }
  console.groupEnd();
};
window.finalizarSolicitacao = finalizarSolicitacao;
window.confirmarBaixaART = confirmarBaixaART;
window.pagarSolicitacao = pagarSolicitacao;
window.assinarArt = assinarArt;
window.fecharConfirmModal = fecharConfirmModal;
window.confirmarAcaoOk = confirmarAcaoOk;
window.confirmarAcaoCancel = confirmarAcaoCancel;
window.salvarAtribuicao = salvarAtribuicao;
window.salvarStatus = salvarStatus;
window.salvarAjuste = salvarAjuste;
window.ajusteRealizado = ajusteRealizado;
window.salvarBaixa = salvarBaixa;

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ script.js em execução - DOMContentLoaded disparado');
  console.log('=== 🚀 INICIANDO APLICAÇÃO ===');
  
  try {
    // Aplicar tema salvo antes de qualquer renderização
    applyTheme(localStorage.getItem('sgart_theme') || 'light');
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    initCache();
    console.log('✅ Cache inicializado');
    
    verificarSessao();
    console.log('✅ Sessão verificada');
    
    configurarEventListeners();
    console.log('✅ Event listeners configurados');
    
    configurarMascaras();
    console.log('✅ Máscaras configuradas');
    
    setupUppercaseInputs();
    console.log('✅ Uppercase em tempo real configurado');
    
    await carregarProjetosClockify();
    console.log('✅ Projetos Clockify carregados');

    await carregarDados();
    console.log('✅ Dados carregados:', AppState.solicitacoes.length, 'solicitações');
    
    renderizarTabela();
    console.log('✅ Tabela renderizada');
    
    atualizarKPIs();
    console.log('✅ KPIs atualizados');
    
    console.log('=== ✨ APLICAÇÃO PRONTA ===');
    
  } catch(e) {
    console.error('=== ❌ ERRO NA INICIALIZAÇÃO ===', e);
    showToast('Erro ao carregar.', 'error');
  }
});
