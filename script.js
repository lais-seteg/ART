// ========== CONFIGURAÇÃO SUPABASE ==========
const SUPABASE_URL = 'https://cbpthkoznhmlmbuynksn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PG5hleeJ53FnP1S65_0WFQ_fUkAePiV';

// Inicializar Supabase com proteção contra biblioteca não carregada
window.supabaseClient = window.supabaseClient || (window.supabase?.createClient 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null);
var supabase = window.supabaseClient;

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
  filterSetor: null,
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
  admin: ['Na fila', 'Processando', 'Ajuste Pendente', 'Pagamento Programado', 'Pago', 'Finalizado', 'Baixa Solicitada', 'Baixa da ART'],
  tecnico: ['Processando', 'Ajuste Pendente', 'Pagamento Programado', 'Baixa Solicitada', 'Baixa da ART', 'Finalizado'],
  financeiro: ['Pagamento Programado', 'Pago', 'Finalizado']
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
    'Ajuste Pendente': 'status-ajuste',
    'Pagamento Programado': 'status-pagamento',
    'Pago': 'status-pago',
    'Finalizado': 'status-finalizado',
    'Baixa Solicitada': 'status-baixa-solicitada',
    'Baixa da ART': 'status-baixa-art'
  };
  return m[s] || 'status-na-fila';
}

// ✅ ATUALIZADO: Permissões com status permitidos e flag de atribuição
function getPermissoes() {
  if (!AppState.usuarioAtual) {
    return { podeEditar: false, podeExcluir: false, podeMudarStatus: false, podeVer: true, tipo: 'anonimo', statusPermitidos: [] };
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

// ========== SUPABASE CRUD ==========
async function carregarSolicitacoesDB() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao carregar:', error);
    return [];
  }
}

async function salvarSolicitacaoDB(dados) {
  if (!supabase) {
    console.warn('⚠️ Supabase indisponível.');
    throw new Error('Supabase indisponível');
  }
  try {
    const { data, error } = await supabase
      .from('solicitacoes')
      .insert([dados])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao salvar:', error);
    throw error;
  }
}

async function atualizarSolicitacaoDB(solicitacaoId, dados) {
  if (!supabase) {
    console.warn('⚠️ Supabase indisponível. Não é possível atualizar.');
    throw new Error('Supabase indisponível');
  }
  try {
    const { data, error } = await supabase
      .from('solicitacoes')
      .update(dados)
      .eq('solicitacao_id', solicitacaoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar no Supabase:', error);
    throw error;
  }
}

async function adicionarHistoricoDB(solicitacaoId, acao, detalhes = '') {
  if (!supabase) {
    console.warn('⚠️ Supabase indisponível. Histórico não será salvo.');
    return;
  }
  try {
    const { error } = await supabase
      .from('historico')
      .insert([{
        solicitacao_id: solicitacaoId,
        acao,
        detalhes,
        usuario_nome: AppState.usuarioAtual?.nome || 'Sistema',
        usuario_tipo: AppState.usuarioAtual?.tipo || 'anonimo'
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
  }
}

async function carregarHistoricoDB(solicitacaoId) {
  if (!supabase) {
    console.warn('⚠️ Supabase indisponível. Retornando histórico vazio.');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('historico')
      .select('*')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    return [];
  }
}

// ========== GERAR ID ==========
function gerarNovoId() {
  return `ART-${String(AppState.solicitacoes.length + 1).padStart(3, '0')}`;
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
      
      const novoId = gerarNovoId();
      dados.solicitacao_id = novoId;
      dados.status = 'Na fila';
      
      await salvarSolicitacaoDB(dados);
      showToast(`${novoId} criada com sucesso!`, 'success');
    }
    
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
    fecharFormulario();
    
  } catch(e) {
    console.error('Erro ao salvar:', e);
    if (e.message && e.message.includes('duplicate key')) {
      showToast('Erro: ID duplicado. Tente novamente.', 'error');
    } else {
      showToast(`Erro ao salvar solicitação: ${e.message || 'Verifique o console (F12).'}`, 'error');
    }
  }
}

// ✅ VALIDAÇÃO DE SENHA VIA BANCO DE DADOS
async function validarSenhaNoBanco(tipo, nome, senha) {
  if (!supabase) {
    showToast('⚠️ Banco de dados indisponível', 'error');
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('validar_credencial_banco', {
      p_tipo: tipo,
      p_nome: nome,
      p_senha: senha
    });

    if (error) {
      console.error('Erro na validação:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Falha ao conectar:', error);
    return false;
  }
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
  
  ['Total', 'Fila', 'Processando', 'Ajuste', 'Pagamento', 'Pago', 'Finalizado', 'Baixa'].forEach(k => {
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
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

async function fazerLogin() {
  const senha = document.getElementById('senhaAcesso')?.value || '';
  const errorEl = document.getElementById('loginError');
  
  if (!senha) {
    errorEl.textContent = 'Digite a senha';
    errorEl.classList.remove('hidden');
    return;
  }
  
  let tipo = AppState.tipoLoginAtual;
  let nome = '';
  
  if (tipo === 'tecnico') {
    nome = document.getElementById('selectTecnico')?.value || '';
    if (!nome) {
      errorEl.textContent = 'Selecione seu nome';
      errorEl.classList.remove('hidden');
      return;
    }
  } else {
    nome = tipo === 'admin' ? 'Gestor Administrativo' : 'Gestor Financeiro';
  }
  
  const valido = await validarSenhaNoBanco(tipo, nome, senha);
  
  if (!valido) {
    errorEl.textContent = 'Senha incorreta';
    errorEl.classList.remove('hidden');
    return;
  }
  
  AppState.usuarioAtual = { tipo, nome };
  localStorage.setItem('seteg_usuario', JSON.stringify(AppState.usuarioAtual));
  
  fecharModalLogin();
  atualizarInterfaceUsuario();
  renderizarTabela();
  atualizarNotificacoesFinanceiro(); // ✅ NOVO: Atualizar notificações ao logar
  showToast(`Bem-vindo, ${nome}!`, 'success');
}

function logout() {
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
  
  if (AppState.usuarioAtual && ui && bg) {
    ui.classList.remove('hidden');
    const ic = {
      admin: '👔',
      tecnico: '🔧',
      financeiro: '💰'
    }[AppState.usuarioAtual.tipo] || '👤';
    bg.textContent = `${ic} ${AppState.usuarioAtual.nome}`;
  } else if (ui) {
    ui.classList.add('hidden');
  }
}

function abrirModalLogin(tipo) {
  AppState.tipoLoginAtual = tipo;
  
  const titulos = {
    admin: 'Acesso Gestor Administrativo',
    tecnico: 'Acesso Técnico',
    financeiro: 'Acesso Gestor Financeiro'
  };
  
  document.getElementById('loginModalTitle').textContent = titulos[tipo] || 'Acesso Restrito';
  document.getElementById('senhaAcesso').value = '';
  document.getElementById('loginError').classList.add('hidden');
  
  const campoTecnico = document.getElementById('campoSelecionarTecnico');
  if (tipo === 'tecnico') {
    campoTecnico.classList.remove('hidden');
    document.getElementById('selectTecnico').value = '';
  } else {
    campoTecnico.classList.add('hidden');
  }
  
  DOM.loginModal?.classList.add('active');
}

// ✅ FUNÇÕES CORRIGIDAS PARA FECHAR MODAIS (com event)
function fecharModalLogin(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (DOM.loginModal) {
    DOM.loginModal.classList.remove('active');
  }
  AppState.tipoLoginAtual = null;
}

// ========== FORMULÁRIO ==========
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
      <button type="button" class="btn btn-ghost-sm">✕</button>
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
      <div class="atividade-summary" id="summary-${idx}">Preencha os campos</div>
    </div>
  `;
  
  c.appendChild(card);
  setupAtividadeEventListeners(card, idx);
}

function setupAtividadeEventListeners(card, idx) {
  card.querySelector('.btn-ghost-sm')?.addEventListener('click', () => {
    card.remove();
    renumerarAtividades();
  });
  
  card.querySelector('.cascade-nivel')?.addEventListener('change', () => atualizarResumoAtividade(idx));
  card.querySelector('.cascade-profissional')?.addEventListener('change', () => atualizarResumoAtividade(idx));
  card.querySelector('.cascade-descricao')?.addEventListener('input', () => atualizarResumoAtividade(idx));
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
  }
  
  if (tipo === 'CREA') {
    d.atividades = coletarAtividadesCREA();
  }
  
  return d;
}

function validarFormulario(tipo) {
  const p = document.getElementById(`form${tipo}`);
  if (!p) return false;
  
  let ok = true;
  
  p.querySelectorAll('.form-control').forEach(f => {
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

// ========== CARREGAR DADOS ==========
async function carregarDados() {
  try {
    AppState.solicitacoes = await carregarSolicitacoesDB();
    console.log('✅ Solicitações carregadas:', AppState.solicitacoes.length);
  } catch(e) {
    console.error('Erro ao carregar dados:', e);
    AppState.solicitacoes = [];
  }
}

// ✅ ATUALIZADO: Filtrar solicitações por atribuição
function renderizarTabela() {
  const tb = DOM.artTableBody;
  if (!tb) return;
  
  const fs = document.querySelector('.filter-pill.active')?.dataset.status || 'todas';
  const fc = DOM.filterConselho?.value || '';
  const fse = DOM.filterSetor?.value || '';
  const bus = DOM.searchInput?.value.toLowerCase().trim() || '';
  const perms = getPermissoes();
  
  let dados = AppState.solicitacoes;
  
  // ✅ NOVO: Filtrar por perfil
  if (AppState.usuarioAtual?.tipo === 'tecnico') {
    // Técnico vê apenas solicitações atribuídas a ele
    dados = dados.filter(s => s.tecnico_responsavel === AppState.usuarioAtual.nome);
  } else if (AppState.usuarioAtual?.tipo === 'financeiro') {
    // Financeiro vê apenas solicitações encaminhadas para pagamento
    dados = dados.filter(s => s.encaminhar_financeiro === true || s.status === 'Pagamento Programado');
  }
  
  // Filtros adicionais
  dados = dados.filter(s => {
    if (fs !== 'todas' && s.status !== fs) return false;
    if (fc && s.tipo !== fc) return false;
    if (fse && s.departamento !== fse) return false;
    if (bus) {
      const t = [s.solicitacao_id, s.solicitante, s.contratante, s.nomeTecnico, s.departamento, s.tecnico_responsavel]
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
  const sc = getStatusClass(s.status);
  const cc = s.tipo === 'CRBio' ? 'cr-bio' : '';
  const sf = str => escapeHtml(str || '—');
  
  let a = `<button class="btn btn-ghost-sm" data-action="ver" data-id="${s.solicitacao_id}" title="Ver Detalhes">👁</button>`;
  
  if (perms.tipoAdmin) {
    a += `<button class="btn btn-ghost-sm" data-action="atribuir" data-id="${s.solicitacao_id}" title="Atribuir Técnico">👥</button>`;
  }
  
  // ✅ NOVO: Técnico pode atribuir ao financeiro
  if (perms.tipoTecnico && perms.podeEncaminharFinanceiro && s.status !== 'Finalizado' && s.status !== 'Pago') {
    a += `<button class="btn btn-ghost-sm" data-action="encaminhar-financeiro" data-id="${s.solicitacao_id}" title="Encaminhar ao Financeiro">💰</button>`;
  }
  
  if (perms.podeMudarStatus) {
    a += `<button class="btn btn-ghost-sm" data-action="status" data-id="${s.solicitacao_id}" title="Alterar Status">🔄</button>`;
  }
  
  if (perms.podeExcluir) {
    a += `<button class="btn btn-ghost-sm" data-action="excluir" data-id="${s.solicitacao_id}" title="Excluir">🗑</button>`;
  }
  
  if (s.status !== 'Finalizado' && s.status !== 'Pago' && s.status !== 'Na fila' && s.status !== 'Baixa Solicitada' && s.status !== 'Baixa da ART') {
    a += `<button class="btn btn-ghost-sm" data-action="ajuste" data-id="${s.solicitacao_id}" title="Solicitar Ajuste">📝</button>`;
  }
  
  // ✅ CORREÇÃO: Botão de baixa aparece quando status é "Finalizado" e baixa não foi solicitada
  if (s.status === 'Finalizado' && !s.baixa_solicitada) {
    a += `<button class="btn btn-ghost-sm" data-action="baixa" data-id="${s.solicitacao_id}" title="Solicitar Baixa da ART">📥</button>`;
  }
  
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${sf(s.solicitacao_id)}</strong></td>
    <td><span class="conselho-badge ${cc}">${sf(s.tipo)}</span></td>
    <td>${sf(s.solicitante)}</td>
    <td>${sf(s.departamento)}</td>
    <td>${sf(s.contratante)}</td>
    <td>${formatarDataBR(s.prazoEmissaoArt)}</td>
    <td><span class="status-badge ${sc}">${sf(s.status)}</span></td>
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
  const counts = {
    Total: AppState.solicitacoes.length,
    Fila: AppState.solicitacoes.filter(s => s.status === 'Na fila').length,
    Processando: AppState.solicitacoes.filter(s => s.status === 'Processando').length,
    Ajuste: AppState.solicitacoes.filter(s => s.status === 'Ajuste Pendente').length,
    Pagamento: AppState.solicitacoes.filter(s => s.status === 'Pagamento Programado').length,
    Pago: AppState.solicitacoes.filter(s => s.status === 'Pago').length,
    Finalizado: AppState.solicitacoes.filter(s => s.status === 'Finalizado').length,
    Baixa: AppState.solicitacoes.filter(s => s.status === 'Baixa da ART' || s.status === 'Baixa Solicitada').length
  };
  
  Object.entries(counts).forEach(([k, v]) => {
    const el = DOM.kpis[k];
    if (el) el.textContent = v;
  });
}

function atualizarFiltroSetores() {
  const s = DOM.filterSetor;
  if (!s) return;
  
  const st = [...new Set(AppState.solicitacoes.map(x => x.departamento).filter(Boolean))].sort();
  const v = s.value;
  
  s.innerHTML = '<option value="">Setor</option>';
  st.forEach(x => {
    s.innerHTML += `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`;
  });
  
  s.value = v;
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
    `<div style="padding: 0.25rem 0; border-bottom: 1px solid var(--border);">
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
  
  let h = `
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Solicitante</span><span class="detail-value">${sf(s.solicitante)}</span></div>
      <div class="detail-item"><span class="detail-label">Data Solicitação</span><span class="detail-value">${formatarDataBR(s.dataSolicitacao)}</span></div>
      <div class="detail-item"><span class="detail-label">Departamento</span><span class="detail-value">${sf(s.departamento)}</span></div>
      <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${getStatusClass(s.status)}">${sf(s.status)}</span></span></div>
    </div>
    
    <div class="detail-section-title">📋 Informações do Projeto</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Empreendimento</span><span class="detail-value">${sf(s.nomeEmpreendimento)}</span></div>
      <div class="detail-item"><span class="detail-label">Código Clockfy</span><span class="detail-value">${sf(s.codigoClockfy)}</span></div>
    </div>
    
    <div class="detail-section-title">🔧 Técnico</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Nome</span><span class="detail-value">${sf(s.nomeTecnico)}</span></div>
      <div class="detail-item"><span class="detail-label">Estado</span><span class="detail-value">${sf(s.estado)}</span></div>
      ${s.tecnico_responsavel ? `<div class="detail-item"><span class="detail-label">Responsável</span><span class="detail-value">${sf(s.tecnico_responsavel)}</span></div>` : ''}
    </div>
    
    <div class="detail-section-title">👤 Contratante</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Nome</span><span class="detail-value">${sf(s.contratante)}</span></div>
      <div class="detail-item"><span class="detail-label">CNPJ</span><span class="detail-value">${sf(s.cnpj)}</span></div>
      <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value">${sf(s.email)}</span></div>
      <div class="detail-item"><span class="detail-label">Contato</span><span class="detail-value">${sf(s.contato)}</span></div>
      <div class="detail-item full-width"><span class="detail-label">Endereço</span><span class="detail-value">${sf(s.endereco)}, ${sf(s.bairro)}, ${sf(s.cep)}</span></div>
    </div>
    
    <div class="detail-section-title">📍 Endereço da Obra</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Endereço</span><span class="detail-value">${sf(s.enderecoObra)}</span></div>
      <div class="detail-item"><span class="detail-label">Bairro</span><span class="detail-value">${sf(s.bairroObra)}</span></div>
      <div class="detail-item"><span class="detail-label">CEP</span><span class="detail-value">${sf(s.cepObra)}</span></div>
      ${s.latitude ? `<div class="detail-item"><span class="detail-label">Latitude</span><span class="detail-value">${sf(s.latitude)}</span></div>` : ''}
      ${s.longitude ? `<div class="detail-item"><span class="detail-label">Longitude</span><span class="detail-value">${sf(s.longitude)}</span></div>` : ''}
    </div>
    
    <div class="detail-section-title">📅 Prazo e Valor</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Início</span><span class="detail-value">${formatarDataBR(s.dataInicio)}</span></div>
      <div class="detail-item"><span class="detail-label">Fim</span><span class="detail-value">${formatarDataBR(s.dataFim)}</span></div>
      <div class="detail-item"><span class="detail-label">Prazo ART</span><span class="detail-value">${formatarDataBR(s.prazoEmissaoArt)}</span></div>
      <div class="detail-item"><span class="detail-label">Horas</span><span class="detail-value">${sf(s.qtdHoras)}</span></div>
      <div class="detail-item"><span class="detail-label">Valor</span><span class="detail-value">${formatarMoedaBR(s.valor)}</span></div>
    </div>
    
    <div class="detail-item full-width" style="margin-top: 0.5rem;">
      <span class="detail-label">Equipe</span>
      <span class="detail-value">${sf(s.equipe)}</span>
    </div>
    
    ${s.atividades && s.atividades.length > 0 ? `
    <div class="detail-section-title">🛠️ Atividades</div>
    ${s.atividades.map((att, i) => `
      <div style="background: var(--bg-secondary); padding: 0.8rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
        <div style="font-weight: 600; color: var(--orange); margin-bottom: 0.3rem;">Atividade ${i+1}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${sf(att.nivel)} › ${sf(att.atividadeProfissional)}</div>
        <div style="font-size:0.8rem; color: var(--text-muted); margin-top: 0.2rem;">${sf(att.descricaoServico)}</div>
      </div>
    `).join('')}
    ` : ''}
    
    <div class="detail-section-title">📁 Documentos</div>
    <div class="detail-grid">
      <div class="detail-item full-width"><span class="detail-label">Local dos Arquivos</span><span class="detail-value">${sf(s.diretorioArquivo)}</span></div>
      <div class="detail-item full-width"><span class="detail-label">Observações</span><span class="detail-value">${sf(s.obsDocumentos)}</span></div>
    </div>
    
    ${s.observacoes ? `
    <div class="detail-section-title">💬 Observações Gerais</div>
    <div class="detail-item full-width">
      <span class="detail-value" style="white-space: pre-wrap;">${sf(s.observacoes)}</span>
    </div>
    ` : ''}
    
    ${s.tipo === 'CRBio' ? `
    <div class="detail-section-title">🔗 CRBio</div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Vinculado ACMB</span><span class="detail-value">${s.vinculadoACMB === 'sim' ? 'Sim' : 'Não'}</span></div>
      <div class="detail-item"><span class="detail-label">Identificação</span><span class="detail-value">${sf(s.identificacao)}</span></div>
      <div class="detail-item"><span class="detail-label">Localidade</span><span class="detail-value">${sf(s.localidade)}</span></div>
      <div class="detail-item"><span class="detail-label">Formato</span><span class="detail-value">${sf(s.formatoExecucao)}</span></div>
    </div>
    <div class="detail-item full-width">
      <span class="detail-label">Descrição Sumária</span>
      <span class="detail-value">${sf(s.descricaoSumaria)}</span>
    </div>
    ` : ''}
  `;
  
  const hist = await carregarHistoricoDB(id);
  if (hist.length > 0) {
    h += `<div class="history-timeline"><div class="history-title">📜 Histórico</div>`;
    hist.forEach(x => {
      h += `<div class="history-item">
        <div class="history-date">${formatarDataHoraBR(x.created_at)}</div>
        <div class="history-user">${sf(x.usuario_nome)} (${x.usuario_tipo})</div>
        <div class="history-action">${sf(x.acao)}${x.detalhes ? ' – ' + sf(x.detalhes) : ''}</div>
      </div>`;
    });
    h += `</div>`;
  }
  
  if (mb) mb.innerHTML = h;
  
  let ft = `<button class="btn btn-ghost" onclick="fecharModal(event)">Fechar</button>`;
  const perms = getPermissoes();
  if (perms.tipoAdmin) ft += `<button class="btn btn-primary" onclick="fecharModal(event);abrirEditModal('${s.solicitacao_id}')">Atribuir Técnico</button>`;
  if (perms.podeMudarStatus) ft += `<button class="btn btn-primary" onclick="fecharModal(event);abrirModalStatus('${s.solicitacao_id}')">Alterar Status</button>`;
  
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
        <option value="Henrique Silva" ${s.tecnico_responsavel === 'Henrique Silva' ? 'selected' : ''}>Henrique Silva</option>
        <option value="Carla Dyane" ${s.tecnico_responsavel === 'Carla Dyane' ? 'selected' : ''}>Carla Dyane</option>
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
  const statusList = perms.statusPermitidos || ['Na fila', 'Processando', 'Ajuste Pendente', 'Pagamento Programado', 'Pago', 'Finalizado', 'Baixa Solicitada', 'Baixa da ART'];
  
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
    
    // Quando financeiro marca "Pago", retorna visualmente ao técnico como Finalizado
    if (AppState.usuarioAtual?.tipo === 'financeiro' && novoStatus === 'Pago') {
      // Mantém o tecnico_responsavel para que a solicitação continue visível para ele
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
    await atualizarSolicitacaoDB(id, { status: 'Ajuste Pendente', ajuste_descricao: descricao });
    await adicionarHistoricoDB(id, 'Ajuste Solicitado', descricao);
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
    await adicionarHistoricoDB(id, 'Baixa Solicitada', `Solicitante: ${solicitante} - ${motivo}`);
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

// ✅ NOVO: Função para técnico encaminhar ao financeiro
async function encaminharAoFinanceiro(id) {
  if (!confirm('Encaminhar esta solicitação ao setor financeiro para pagamento?')) return;
  
  try {
    await atualizarSolicitacaoDB(id, { 
      status: 'Pagamento Programado',
      encaminhar_financeiro: true 
    });
    await adicionarHistoricoDB(id, 'Encaminhado ao Financeiro', 'Solicitação enviada para pagamento');
    showToast('Encaminhado ao financeiro com sucesso!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao encaminhar:', e);
    showToast('Erro ao encaminhar ao financeiro.', 'error');
  }
}

async function excluirSolicitacao(id) {
  if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
  
  if (!supabase) {
    showToast('⚠️ Supabase indisponível. Não é possível excluir.', 'error');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('solicitacoes')
      .delete()
      .eq('solicitacao_id', id);
    
    if (error) throw error;
    
    showToast('Solicitação excluída!', 'success');
    AppState.solicitacoes = await carregarSolicitacoesDB();
    renderizarTabela();
    atualizarKPIs();
  } catch(e) {
    console.error('Erro ao excluir:', e);
    showToast('Erro ao excluir solicitação.', 'error');
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
  });
  
  DOM.artForm?.addEventListener('submit', e => {
    e.preventDefault();
    salvarSolicitacao();
  });
  
  DOM.artForm?.addEventListener('reset', () => {
    setTimeout(() => {
      document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
      limparAtividadesCREA();
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
      baixa: () => abrirBaixaModal(id),
      // ✅ NOVO: Ação para técnico encaminhar ao financeiro
      'encaminhar-financeiro': () => encaminharAoFinanceiro(id)
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
window.encaminharAoFinanceiro = encaminharAoFinanceiro; // ✅ NOVO

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ script.js em execução - DOMContentLoaded disparado');
  console.log('=== 🚀 INICIANDO APLICAÇÃO ===');
  
  try {
    initCache();
    console.log('✅ Cache inicializado');
    
    verificarSessao();
    console.log('✅ Sessão verificada');
    
    configurarEventListeners();
    console.log('✅ Event listeners configurados');
    
    configurarMascaras();
    console.log('✅ Máscaras configuradas');
    
    await carregarDados();
    console.log('✅ Dados carregados:', AppState.solicitacoes.length, 'solicitações');
    
    renderizarTabela();
    console.log('✅ Tabela renderizada');
    
    atualizarKPIs();
    console.log('✅ KPIs atualizados');
    
    atualizarFiltroSetores();
    console.log('✅ Filtros de setor atualizados');
    
    console.log('=== ✨ APLICAÇÃO PRONTA ===');
    
  } catch(e) {
    console.error('=== ❌ ERRO NA INICIALIZAÇÃO ===', e);
    showToast('Erro ao carregar.', 'error');
  }
});