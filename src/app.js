import './styles.css';
import './claude-shim.js';
import { signIn, signOut, restoreSession, apiRequest } from './auth.js';

/* ===================== Møltz · protótipo v3 · dados de exemplo ===================== */
const TODAY=new Date();TODAY.setHours(0,0,0,0);const DAY=864e5;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>'R$ '+Math.round(v).toLocaleString('pt-BR');
const brl2=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const compact=v=>v>=1e6?'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi':v>=1e3?'R$ '+Math.round(v/1e3).toLocaleString('pt-BR')+' mil':brl(v);
const pct=(v,d=1)=>v.toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d})+'%';
const fdate=d=>d.toLocaleDateString('pt-BR',{day:'numeric',month:'short'}).replace('.','');
const fdateY=d=>d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
const days=d=>Math.round((d-TODAY)/DAY);
const plural=(n,s,p)=>n+' '+(n===1?s:p);
const cap=s=>s[0].toUpperCase()+s.slice(1);
const store={get(k,d){try{const v=localStorage.getItem('moltz3:'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('moltz3:'+k,JSON.stringify(v))}catch(e){}}};
const MONTHS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MONTHS_L=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rng(20261025);const pick=a=>a[Math.floor(R()*a.length)];const between=(a,b)=>a+R()*(b-a);const ib=(a,b)=>Math.floor(between(a,b+1));

const INS=['Porto','SulAmérica','Bradesco Saúde','Amil','Allianz','Tokio Marine','Justos','HDI','Icatu','Prudential','MAG','Omint'];
const RAMOS=['Auto','Saúde PME','Saúde coletiva','Vida individual','Vida em grupo','Residencial','Empresarial','Odonto'];
const RAMO_INS={'Auto':['Porto','Allianz','Tokio Marine','Justos','HDI'],'Saúde PME':['SulAmérica','Bradesco Saúde','Amil','Porto','Omint'],'Saúde coletiva':['SulAmérica','Bradesco Saúde','Amil','Omint'],'Vida individual':['Prudential','MAG','Icatu'],'Vida em grupo':['MAG','Icatu','Prudential'],'Residencial':['Porto','Tokio Marine','Allianz'],'Empresarial':['Tokio Marine','Allianz','HDI'],'Odonto':['SulAmérica','Amil']};
const COMM={'Auto':.18,'Saúde PME':.05,'Saúde coletiva':.03,'Vida individual':.30,'Vida em grupo':.20,'Residencial':.25,'Empresarial':.20,'Odonto':.10};
const VEIC=[{m:'Chevrolet Spin',l:7},{m:'Toyota SW4',l:7},{m:'Jeep Commander',l:7},{m:'Caoa Chery Tiggo 8',l:7},{m:'Chevrolet Onix',l:5},{m:'Hyundai HB20',l:5},{m:'Jeep Compass',l:5},{m:'VW T-Cross',l:5},{m:'Toyota Corolla',l:5},{m:'Fiat Pulse',l:5},{m:'Nissan Kicks',l:5},{m:'Honda HR-V',l:5},{m:'Fiat Strada',l:2},{m:'BYD Dolphin',l:5}];
const FN_M=['Rafael','Bruno','Thiago','Lucas','Marcelo','André','Gustavo','Felipe','Rodrigo','Diego','Eduardo','Paulo','Ricardo','Leonardo','Vinícius','Carlos','João','Pedro'];
const FN_F=['Mariana','Juliana','Camila','Fernanda','Patrícia','Aline','Beatriz','Larissa','Renata','Carolina','Tatiane','Luiza','Gabriela','Cristina','Ana','Paula','Débora','Helena'];
const LN=['Almeida','Barbosa','Cardoso','Costa','Duarte','Ferreira','Gomes','Lima','Macedo','Moura','Nogueira','Pereira','Ramos','Rocha','Siqueira','Teixeira','Vasconcelos','Xavier','Azevedo','Brandão'];
const PROF=['Engenheiro(a)','Médico(a)','Advogado(a)','Empresário(a)','Analista','Professor(a)','Dentista','Arquiteto(a)','Servidor(a) público(a)','Contador(a)','Gerente comercial','Desenvolvedor(a)'];
const CID={'Rio de Janeiro':21,'Niterói':21,'São Paulo':11,'Belo Horizonte':31,'Curitiba':41,'Campinas':19,'Vitória':27,'Petrópolis':24};
const PJ_N=['Padaria','Clínica','Escritório Contábil','Studio','Distribuidora','Ótica','Construtora','Pet Shop','Agência','Laboratório','Restaurante','Academia','Transportadora','Consultoria','Colégio'];
const PJ_S=['Aurora','Horizonte','Vila Rica','Bela Vista','Serra Azul','Atlântico','Mirante','Ipê','Guanabara','Primavera','Cedro','Lagoa','Jequitibá'];
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'');

function makePolicy(cl,ramo){
  const ins=pick(RAMO_INS[ramo]);let pr;
  if(ramo==='Auto')pr=between(2400,7800)*(cl.idade<26?1.6:1);
  else if(ramo==='Saúde PME')pr=(cl.vidas||ib(2,8))*between(700,1500)*12;
  else if(ramo==='Saúde coletiva')pr=cl.vidas*between(420,780)*12;
  else if(ramo==='Vida individual')pr=between(1500,7200);
  else if(ramo==='Vida em grupo')pr=(cl.vidas||10)*between(160,420);
  else if(ramo==='Residencial')pr=between(350,1400);
  else if(ramo==='Empresarial')pr=between(2500,14000);
  else pr=(cl.vidas||5)*between(220,420);
  const fim=new Date(TODAY.getTime()+ib(-25,300)*DAY);const d=days(fim);
  const reajPrev=ramo.startsWith('Saúde')?between(6,26):ramo==='Auto'?between(-6,22):between(0,12);
  const st=d<0?pick(['Não iniciada','Não iniciada','Em negociação']):d<=60?pick(['Não iniciada','Cotando','Em negociação','Renovada']):pick(['Não iniciada','Não iniciada','Não iniciada','Cotando']);
  return{id:'AP'+ib(100000,999999),ramo,ins,premio:Math.round(pr),comissao:COMM[ramo]*(0.85+R()*0.3),fim,reajPrev,status:st,novo:R()<.08};
}
function phone(city){const d=CID[city];return`(${d}) 9${ib(6000,9999)}-${String(ib(0,9999)).padStart(4,'0')}`}
const CLIENTS=[];
for(let i=0;i<64;i++){
  const sexo=R()<.52?'Homem':'Mulher',idade=ib(21,68);
  const ec=idade<27?pick(['Solteiro(a)','Solteiro(a)','Casado(a)']):pick(['Casado(a)','Casado(a)','Solteiro(a)','Divorciado(a)','União estável']);
  const casado=/Casado|União/.test(ec),dep=casado?ib(0,3):(R()<.2?1:0),classe=pick(['A','B','B','B','C']);
  const score=Math.round(classe==='A'?between(700,960):classe==='B'?between(560,900):between(380,760));
  const nome=(sexo==='Homem'?pick(FN_M):pick(FN_F))+' '+pick(LN)+' '+pick(LN);const cidade=pick(Object.keys(CID));
  let veic=null;if(R()<.78){const v=(dep>=2&&R()<.6)?pick(VEIC.slice(0,4)):pick(VEIC);veic={...v,ano:ib(2016,2026)};}
  const cl={id:'C'+(1000+i),tipo:'PF',nome,sexo,idade,ec,dep,classe,score,prof:pick(PROF),cidade,veic,casaPropria:R()<.55,cnpj:R()<.28,condJovem:(idade>=42&&dep>0&&R()<.45),desde:ib(2014,2026),ultContato:ib(3,190),apolices:[],
    tel:phone(cidade),email:slug(nome.split(' ')[0]+' '+nome.split(' ').slice(-1)[0])+'@exemplo.com.br'};
  if(veic)cl.apolices.push(makePolicy(cl,'Auto'));
  if(R()<.22)cl.apolices.push(makePolicy(cl,'Vida individual'));
  if(R()<.18)cl.apolices.push(makePolicy(cl,'Residencial'));
  if(cl.cnpj&&R()<.4){cl.vidas=ib(2,6);cl.apolices.push(makePolicy(cl,'Saúde PME'));}
  if(!cl.apolices.length)cl.apolices.push(makePolicy(cl,R()<.5?'Vida individual':'Residencial'));
  CLIENTS.push(cl);
}
for(let i=0;i<22;i++){
  const vidas=R()<.4?ib(30,110):ib(2,29),nome=pick(PJ_N)+' '+pick(PJ_S)+(R()<.5?' Ltda':' ME'),cidade=pick(Object.keys(CID));
  const resp=(R()<.5?pick(FN_M):pick(FN_F))+' '+pick(LN);
  const cl={id:'E'+(200+i),tipo:'PJ',nome,vidas,socios:ib(1,4),cidade,sinistr:vidas>=30?between(58,112):between(50,95),desde:ib(2015,2026),ultContato:ib(5,200),apolices:[],score:Math.round(between(520,940)),classe:'PJ',
    resp,tel:phone(cidade),email:slug(resp.split(' ')[0])+'@'+slug(nome.replace(/ (Ltda|ME)$/,'')).replace(/\./g,'')+'.com.br'};
  cl.apolices.push(makePolicy(cl,vidas>=30?'Saúde coletiva':'Saúde PME'));
  if(R()<.35)cl.apolices.push(makePolicy(cl,'Vida em grupo'));
  if(R()<.3)cl.apolices.push(makePolicy(cl,'Empresarial'));
  if(vidas>=10&&R()<.3)cl.apolices.push(makePolicy(cl,'Odonto'));
  CLIENTS.push(cl);
}
/* Sessão: cada corretora é um tenant isolado. Toda leitura de dados passa por scoped(). */
const SESSION={corretora:'CORR-0001',nome:'Corretora Exemplo',usuario:'corretor@exemplo.com.br'};
CLIENTS.forEach(c=>c.tenant=SESSION.corretora);
const scoped=()=>CLIENTS.filter(c=>c.tenant===SESSION.corretora);
const POLICIES=CLIENTS.flatMap(c=>c.apolices.map(p=>{p.cli=c;return p}));
CLIENTS.forEach(c=>{c.premio=c.apolices.reduce((s,p)=>s+p.premio,0);c.receita=c.apolices.reduce((s,p)=>s+p.premio*p.comissao,0);c.ramos=new Set(c.apolices.map(p=>p.ramo));c.prox=[...c.apolices].filter(p=>p.status!=='Renovada').sort((a,b)=>a.fim-b.fim)[0]||null;});
const PREMS=[...CLIENTS].map(c=>c.premio).sort((a,b)=>a-b);const quart=v=>PREMS.findIndex(x=>x>=v)/PREMS.length;
const TOP20=PREMS[Math.floor(PREMS.length*.8)];
const byId=id=>CLIENTS.find(c=>c.id===id);
(()=>{const r=rng(55);CLIENTS.forEach(c=>{c.missing=[];if(r()<.2){const opts=c.tipo==='PF'?['E-mail','Data de nascimento','Dependentes','Imóvel próprio','Profissão']:['E-mail do RH','Relação de vidas','Data de fundação'];c.missing.push(opts[Math.floor(r()*opts.length)]);if(r()<.4){const o2=opts[Math.floor(r()*opts.length)];if(!c.missing.includes(o2))c.missing.push(o2);}}});})();
const REC_P80=[...CLIENTS].map(c=>c.receita).sort((a,b)=>a-b)[Math.floor(CLIENTS.length*.8)];
function faixa(i){return i<25?'18–24':i<35?'25–34':i<45?'35–44':i<55?'45–54':'55+'}
function ecW(c){const m=c.sexo==='Homem';return c.ec.startsWith('Casado')?(m?'casado':'casada'):c.ec.startsWith('Solteiro')?(m?'solteiro':'solteira'):c.ec.startsWith('Divorciado')?(m?'divorciado':'divorciada'):'união estável'}
function persona(c){return c.tipo==='PJ'?`Empresa · ${c.vidas} vidas · ${c.cidade}`:`${c.sexo} · ${faixa(c.idade)} · ${ecW(c)} · classe ${c.classe}`}

/* ---------- motor de ofertas + propensão ---------- */
const has=(c,r)=>c.ramos.has(r);
const RULES=[
  {id:'r1',prod:'Vida individual',who:'Casados com auto e bom score',test:c=>c.tipo==='PF'&&has(c,'Auto')&&/Casado|União/.test(c.ec)&&c.score>=700&&!has(c,'Vida individual'),fit:c=>c.dep>0?1:.7,why:'A renda da família depende do titular e há capacidade de pagamento. Estado civil já faz parte do questionário de risco do auto.',src:'Questionário de risco do auto',ticket:c=>3200},
  {id:'r2',prod:'Vida e saúde familiar',who:'Donos de carro de 7 lugares',test:c=>c.veic&&c.veic.l===7&&(!has(c,'Vida individual')||!has(c,'Saúde PME')),fit:c=>c.dep>=2?1:c.dep?.8:.5,why:'Spin, SW4, Commander e similares indicam família numerosa, o público com maior necessidade de vida e saúde.',src:'Modelo do veículo na apólice auto',ticket:c=>9800},
  {id:'r3',prod:'Vida dos pais e acidentes pessoais',who:'Pais com filho jovem como condutor',test:c=>c.condJovem&&!has(c,'Vida individual'),fit:c=>1,why:'Filho de 18 a 25 anos dirigindo indica dependente em formação, um evento de vida que abre a conversa sobre proteção da família.',src:'Condutores da apólice auto',ticket:c=>2800},
  {id:'r4',prod:'Vida em grupo',who:'Empresas com saúde e sem vida em grupo',test:c=>c.tipo==='PJ'&&!has(c,'Vida em grupo'),fit:c=>c.vidas>=10?1:.7,why:'Os titulares já estão cadastrados. Vida em grupo tem custo baixo por vida e aumenta a retenção do contrato de saúde.',src:'Relação de vidas da apólice de saúde',ticket:c=>c.vidas*260},
  {id:'r5',prod:'Saúde PME',who:'Pessoas físicas com CNPJ ativo',test:c=>c.tipo==='PF'&&c.cnpj&&!has(c,'Saúde PME'),fit:c=>c.dep?1:.75,why:'Saúde PME a partir de 2 vidas costuma custar menos que um plano individual. Sócio de empresa é o perfil de entrada ideal.',src:'Cadastro informado pelo corretor',ticket:c=>(2+c.dep)*900*12},
  {id:'r6',prod:'Residencial',who:'Clientes de auto com imóvel próprio',test:c=>c.tipo==='PF'&&has(c,'Auto')&&c.casaPropria&&!has(c,'Residencial'),fit:c=>.85,why:'Ticket baixo e alta retenção: quem tem dois produtos troca menos de corretora.',src:'CEP de pernoite e cadastro do corretor',ticket:c=>780},
  {id:'r7',prod:'Odonto empresarial',who:'Empresas com 10+ vidas sem odonto',test:c=>c.tipo==='PJ'&&c.vidas>=10&&!has(c,'Odonto'),fit:c=>c.vidas>=30?1:.8,why:'Benefício barato por vida e bem percebido pelo colaborador; complementa a saúde sem afetar o reajuste.',src:'Relação de vidas da apólice de saúde',ticket:c=>c.vidas*300},
  {id:'r8',prod:'Vida com doenças graves',who:'45 a 60 anos, classe A/B, score alto',test:c=>c.tipo==='PF'&&c.idade>=45&&c.idade<=60&&/A|B/.test(c.classe)&&c.score>=750&&!has(c,'Vida individual'),fit:c=>c.classe==='A'?1:.8,why:'Faixa com maior incidência de doenças graves e patrimônio formado. Contratar antes dos 60 evita prêmio e aceitação piores.',src:'Bureau de crédito (com consentimento)',ticket:c=>5600},
  {id:'r9',prod:'Empresarial',who:'Empresas sem seguro patrimonial',test:c=>c.tipo==='PJ'&&!has(c,'Empresarial'),fit:c=>.7,why:'Quem já protege as pessoas confia na corretora; o patrimônio da empresa costuma estar descoberto.',src:'Cadastro da empresa',ticket:c=>6200}
];
/* Propensão (0–100): aderência ao gatilho 30 · recência de contato 20 · relacionamento 15 · valor 15 · capacidade de pagamento 10 · momento 10 */
function propensity(c,r){
  const parts=[];const add=(k,v,max)=>parts.push([k,Math.round(v),max]);
  add('Aderência ao gatilho da regra',30*r.fit(c),30);
  add('Contato recente',c.ultContato<=30?20:c.ultContato<=90?12:c.ultContato<=150?6:2,20);
  const yrs=TODAY.getFullYear()-c.desde;add('Relacionamento (tempo de casa e produtos)',Math.min(8,yrs*1.6)+(c.apolices.length>=2?7:0),15);
  add('Valor do cliente na carteira',15*quart(c.premio),15);
  add('Capacidade de pagamento',c.score>=800?10:c.score>=700?8:c.score>=600?5:2,10);
  const d=c.prox?days(c.prox.fim):999;add('Momento (renovação próxima ou evento de vida)',(d>=0&&d<=90?10:0)||(c.condJovem?8:2),10);
  return{score:Math.min(100,parts.reduce((s,p)=>s+p[1],0)),parts};
}
const propLvl=s=>s>=70?['Alta','p3']:s>=50?['Média','p2']:['Baixa','p1'];
const propHTML=s=>{const[l,c]=propLvl(s);return`<span class="prop ${c}"><span class="bars"><i></i><i></i><i></i></span>${l}</span>`};
CLIENTS.forEach(c=>{c.offers=RULES.filter(r=>r.test(c)).map(r=>{const p=propensity(c,r);return{rule:r,valor:Math.round(r.ticket(c)),prop:p.score,parts:p.parts}}).sort((a,b)=>b.prop-a.prop);});
RULES.forEach(r=>{r.items=CLIENTS.filter(c=>c.offers.some(o=>o.rule===r)).map(c=>({c,o:c.offers.find(o=>o.rule===r)})).sort((a,b)=>b.o.prop-a.o.prop);r.total=r.items.reduce((s,x)=>s+x.o.valor,0);r.high=r.items.filter(x=>x.o.prop>=70).length;});

/* ---------- risco de renovação ---------- */
POLICIES.forEach(p=>{const c=p.cli,parts=[];
  if(p.reajPrev>15)parts.push(['Reajuste previsto acima de 15%',25]);
  if(c.tipo==='PJ'&&c.vidas>=30&&c.sinistr>75)parts.push(['Sinistralidade acima da meta de 75%',25]);
  if(c.ultContato>90)parts.push(['Sem contato há mais de 90 dias',20]);
  if(c.ramos.size===1)parts.push(['Tem um único produto conosco',10]);
  if(TODAY.getFullYear()-c.desde<2)parts.push(['Cliente há menos de 2 anos',10]);
  if(c.premio>=TOP20)parts.push(['Está entre os 20% maiores da carteira',10]);
  p.parts=parts;p.risk=Math.min(100,parts.reduce((s,x)=>s+x[1],0));});
const riskWord=r=>r>=70?['Alto','red']:r>=40?['Médio','amber']:['Baixo','green'];
const POOL={'SulAmérica':14.9,'Bradesco Saúde':16.2,'Amil':13.8,'Porto':12.4,'Omint':15.1};

/* ---------- comissões ---------- */
const monthDate=o=>new Date(TODAY.getFullYear(),TODAY.getMonth()+o,1);
const mLabel=o=>MONTHS[monthDate(o).getMonth()];
const mFull=o=>{const d=monthDate(o);return MONTHS_L[d.getMonth()]+(d.getFullYear()!==TODAY.getFullYear()?' de '+d.getFullYear():'')};
function commMonth(o){const r=rng(9000+o*31),growth=1+(o+11)*0.012,rows=[];
  POLICIES.forEach(p=>{const base=p.premio/12;let prev=base*p.comissao*growth*(0.96+r()*0.08),tipo='Recorrente';
    if(p.ramo.startsWith('Saúde')&&p.novo&&o>=-2&&o<=0){prev+=base;tipo='Agenciamento';}
    if(o>0&&days(p.fim)<o*30&&p.status!=='Renovada'){rows.push({p,prev,pago:null,tipo,risco:true,base});return;}
    let pago=prev,st='ok';
    if(o<0){if(r()<.05&&o>=-3){pago=prev*(0.55+r()*0.3);st='div';}}
    else if(o===0){const x=r();if(x<.45){pago=null;st='pend';}else if(x<.52){pago=prev*(0.6+r()*0.25);st='div';}}
    else{pago=null;st='prev';}
    rows.push({p,prev,pago,tipo,st,base});});
  return rows;}
const CC={};const cm=o=>CC[o]||(CC[o]=commMonth(o));
const sumPrev=o=>cm(o).reduce((s,x)=>s+x.prev,0);const sumPago=o=>cm(o).reduce((s,x)=>s+(x.pago||0),0);
const RET=0.05;

/* ---------- estado ---------- */
const S={view:'inicio',done:store.get('done',{}),events:store.get('events',{}),acts:store.get('acts',{contatos:0,conv:0,salvas:0,trilhas:0}),
  ren:'30',renMode:'todas',renPage:1,comTab:'extrato',comMonth:-1,meta:75,vcmh:13,trainIns:'SulAmérica',chat:[],
  cf:{tipo:[],ramo:[],ins:[],venc:[],cont:[],prod:[],rec:[],cid:[],sinal:[]},popG:null,cols:store.get('cols',null)||['produtos','acao','venc','contato'],sel:{},review:store.get('review',{}),cad:store.get('cad',{}),desTab:'indicadores',cq:'',cRamo:'Todos',cIns:'Todas',cProd:'todos',cSort:'receita',cDir:-1,cPage:1,cOpen:{}};
const saveActs=()=>store.set('acts',S.acts);

/* ---------- desempenho (gamificação) ---------- */
const LEVELS=[{n:'Insight',min:0},{n:'Advisor',min:400},{n:'Partner',min:550},{n:'Private',min:700},{n:'Signature',min:850}];
function pillars(){
  const comMes=sumPago(-1),comMed=[-6,-5,-4,-3,-2].reduce((s,o)=>s+sumPago(o),0)/5,metaCom=comMed*1.08;
  const opps=CLIENTS.reduce((s,c)=>s+c.offers.length,0),conv=11+S.acts.conv;
  const riscos=POLICIES.filter(p=>p.risk>=40&&days(p.fim)<60).length,salvas=Math.round(riscos*.62)+S.acts.salvas;
  const ativos=CLIENTS.filter(c=>c.ultContato<=90).length+S.acts.contatos;
  const trilhas=1+S.acts.trilhas,eventos=Object.keys(S.events).length;
  const P=[
    {k:'Receita',w:25,cur:compact(comMes),meta:compact(metaCom),ratio:comMes/metaCom,d:'Comissão recebida no mês fechado contra a meta (média dos 5 meses anteriores + 8%).',tip:'Feche as vendas de propensão alta e concilie divergências de comissão.'},
    {k:'Crescimento da carteira',w:15,cur:'+8,4%',meta:'+12%',ratio:8.4/12,d:'Variação do prêmio anual da carteira em 12 meses.',tip:'Novas vendas e renovações sem perda de prêmio.'},
    {k:'Oportunidades aproveitadas',w:20,cur:`${conv} de ${opps}`,meta:'25%',ratio:(conv/opps)/.25,d:'Vendas fechadas sobre as oportunidades sugeridas pelo motor no trimestre.',tip:'Comece pelas oportunidades de propensão alta.'},
    {k:'Riscos contidos',w:20,cur:`${Math.min(salvas,riscos)} de ${riscos}`,meta:'85%',ratio:(Math.min(salvas,riscos)/riscos)/.85,d:'Renovações com risco médio ou alto que foram renovadas sem perda.',tip:'Prepare as renovações de risco alto com 120 dias.'},
    {k:'Relacionamento',w:10,cur:`${Math.min(ativos,CLIENTS.length)} de ${CLIENTS.length}`,meta:'80%',ratio:(Math.min(ativos,CLIENTS.length)/CLIENTS.length)/.8,d:'Clientes com contato registrado nos últimos 90 dias.',tip:'Registre cada contato; o WhatsApp do modal já deixa a mensagem pronta.'},
    {k:'Capacitação',w:10,cur:`${plural(trilhas,'trilha','trilhas')} · ${plural(eventos,'evento','eventos')}`,meta:'3 trilhas',ratio:(trilhas+eventos*.5)/3,d:'Trilhas concluídas e eventos no trimestre.',tip:'Uma trilha curta por mês mantém o pilar cheio.'}
  ];
  P.forEach(p=>{p.ratio=Math.max(0,Math.min(1,p.ratio));p.pts=Math.round(p.ratio*p.w*10);});
  return P;
}
const imp=()=>pillars().reduce((s,p)=>s+p.pts,0);
const level=v=>LEVELS.reduce((l,x)=>v>=x.min?x:l,LEVELS[0]);
const nextLevel=v=>LEVELS.find(x=>x.min>v);

/* ---------- WhatsApp ---------- */
function waMsg(c,ctx){const nome=c.tipo==='PF'?c.nome.split(' ')[0]:c.resp.split(' ')[0];
  if(ctx&&ctx.p){const p=ctx.p,d=days(p.fim);return`Olá, ${nome}! Tudo bem? Aqui é da sua corretora. ${d<0?`Seu seguro ${p.ramo.toLowerCase()} com a ${p.ins} venceu em ${fdate(p.fim)} e quero resolver a renovação com você hoje.`:`Seu seguro ${p.ramo.toLowerCase()} com a ${p.ins} vence em ${fdate(p.fim)} e quero antecipar a renovação para não termos surpresa no valor.`} Podemos conversar 15 minutos esta semana?`;}
  if(ctx&&ctx.o)return`Olá, ${nome}! Tudo bem? Aqui é da sua corretora. Revisando sua carteira, vi uma oportunidade de ${ctx.o.rule.prod.toLowerCase()} que faz sentido para o seu momento. Posso te mostrar uma proposta rápida esta semana?`;
  return`Olá, ${nome}! Tudo bem? Aqui é da sua corretora. Estou revisando sua carteira e queria marcar uma conversa rápida. Qual o melhor horário para você?`;}
/* Na demonstração o link abre o WhatsApp sem destinatário, para nunca acionar um número real por engano. */
const waURL=(c,ctx)=>'https://wa.me/?text='+encodeURIComponent(waMsg(c,ctx));
const WA_SVG='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/></svg>';
const waBtn=(c,ctx,small)=>small?`<a class="wa-ic" href="${waURL(c,ctx)}" target="_blank" rel="noopener" data-act="wa" data-id="${c.id}" aria-label="Enviar WhatsApp para ${esc(c.nome)}" title="WhatsApp · na demonstração abre sem destinatário">${WA_SVG}</a>`:`<a class="btn wa-o" href="${waURL(c,ctx)}" target="_blank" rel="noopener" data-act="wa" data-id="${c.id}" title="Na demonstração, abre o WhatsApp sem destinatário">${WA_SVG}WhatsApp</a>`;
const contactHTML=(c,ctx)=>`<div class="contact"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>${c.tel}</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>${esc(c.email)}</span>${c.tipo==='PJ'?`<span>Contato: ${esc(c.resp)}</span>`:''}${waBtn(c,ctx)}</div>`;

/* ---------- ícones ---------- */
const ICONS={inicio:'<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',carteira:'<path d="M5 20V10M12 20V4M19 20v-7"/>',renovacoes:'<path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3"/><path d="M5 3v5h5M19 21v-5h-5"/>',comissoes:'<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5M12 6.5v1.5M12 16v1.5"/>',mais:'<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',chev:'<path d="m9 6 6 6-6 6"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',check:'<path d="m5 12 4.5 4.5L19 7"/>',dl:'<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',send:'<path d="M5 12h14M13 6l6 6-6 6"/>'};
const ico=(k,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
const NAV=[['inicio','Início'],['carteira','Carteira'],['renovacoes','Renovações'],['oportunidades','Oportunidades']];
const MORE=[['avisos','Avisos'],['desempenho','Desempenho'],['treinamento','Treinamento'],['eventos','Eventos']];

const row=(main,end,attrs='')=>`<button class="row" ${attrs}><span class="main">${main}</span><span class="end">${end}${ico('chev','chev')}</span></button>`;
const txt=(t,s)=>`<span class="txt"><span class="ttl">${t}</span>${s?`<span class="sub">${s}</span>`:''}</span>`;
const seg=(items,cur,act)=>`<div class="seg" role="tablist">${items.map(([k,l,c])=>`<button role="tab" class="${cur===k?'on':''}" data-act="${act}" data-v="${k}">${l}${c!=null?`<span class="c">${c}</span>`:''}</button>`).join('')}</div>`;
const head=(h,p,right='')=>`<div class="hero"><div class="head"><h1>${h}</h1>${p?`<p>${p}</p>`:''}</div>${right}</div>`;
const stat=(k,v,d,attrs='',on=false)=>`<${attrs?'button':'div'} class="stat ${on?'on':''}" ${attrs}><span class="k">${k}</span><span class="v">${v}</span>${d?`<span class="d">${d}</span>`:''}</${attrs?'button':'div'}>`;
function pager(total,page,size,act){const pages=Math.max(1,Math.ceil(total/size)),from=total?(page-1)*size+1:0,to=Math.min(total,page*size);
  let nums=[];for(let i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-page)<=1)nums.push(i);else if(nums[nums.length-1]!=='…')nums.push('…');
  return`<div class="pager"><span>${from}–${to} de ${total}</span><div class="pg"><button data-act="${act}" data-v="${page-1}" ${page<=1?'disabled':''} aria-label="Anterior">‹</button>${nums.map(n=>n==='…'?'<button disabled>…</button>':`<button class="${n===page?'on':''}" data-act="${act}" data-v="${n}">${n}</button>`).join('')}<button data-act="${act}" data-v="${page+1}" ${page>=pages?'disabled':''} aria-label="Próxima">›</button></div></div>`;}

function commBars(){const os=[],narrow=innerWidth<=720;for(let o=narrow?-5:-11;o<=(narrow?2:5);o++)os.push(o);
  const W=narrow?420:960,h=narrow?170:190,pad={t:24,b:28},bw=W/os.length,vals=os.map(o=>o<0?sumPago(o):sumPrev(o)),max=Math.max(...vals)*1.1;
  return`<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="Comissões por mês">${os.map((o,i)=>{const v=vals[i],bh=(h-pad.t-pad.b)*v/max,xx=i*bw+bw*.22,yy=h-pad.b-bh,sel=o===S.comMonth,fut=o>0;
    return`<g class="hit" data-act="cmonth" data-v="${o}"><rect x="${i*bw}" y="0" width="${bw}" height="${h}" fill="transparent"/><rect x="${xx}" y="${yy}" width="${bw*.56}" height="${bh}" rx="5" fill="${sel?'var(--green)':fut?'none':'var(--text)'}" stroke="${fut&&!sel?'var(--text-3)':'none'}" stroke-dasharray="${fut?'3 3':''}" opacity="${sel?1:fut?.9:.16}"><title>${mFull(o)}: ${brl(v)}</title></rect>${sel?`<text x="${xx+bw*.28}" y="${yy-8}" text-anchor="middle" style="fill:var(--text);font-weight:600">${compact(v)}</text>`:''}<text x="${xx+bw*.28}" y="${h-8}" text-anchor="middle" style="${o===0?'fill:var(--text);font-weight:600':''}">${mLabel(o)}</text></g>`}).join('')}</svg>`;}

/* ===================== TELAS ===================== */
const V={};
V.inicio=()=>{
  const venc=POLICIES.filter(p=>days(p.fim)<0&&p.status!=='Renovada').sort((a,b)=>b.premio-a.premio);
  const exp=POLICIES.filter(p=>{const d=days(p.fim);return d>=0&&d<=30&&p.status==='Não iniciada'}).sort((a,b)=>a.fim-b.fim);
  const best=CLIENTS.flatMap(c=>c.offers.map(o=>({c,o}))).sort((a,b)=>b.o.prop-a.o.prop||b.o.valor-a.o.valor)[0];
  const items=[];
  if(venc[0])items.push({id:venc[0].cli.id,h:`Recupere a renovação de ${venc[0].cli.nome}`,p:`${venc[0].ramo} · ${venc[0].ins} · venceu há ${plural(-days(venc[0].fim),'dia','dias')} · ${brl(venc[0].premio)}/ano`,l:'Resolver'});
  if(exp[0])items.push({id:exp[0].cli.id,h:`Inicie a renovação de ${exp[0].cli.nome}`,p:`${exp[0].ramo} · ${exp[0].ins} · vence em ${plural(days(exp[0].fim),'dia','dias')}`,l:'Preparar'});
  if(best)items.push({id:best.c.id,tab:'ofertas',h:`Ofereça ${best.o.rule.prod} para ${best.c.nome}`,p:`${best.o.rule.who} · propensão ${propLvl(best.o.prop)[0].toLowerCase()} · ${brl(best.o.valor)}/ano`,l:'Ver oferta'});
  const hour=new Date().getHours(),hi=hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite';
  const r30=POLICIES.filter(p=>{const d=days(p.fim);return d>=0&&d<=30&&p.status!=='Renovada'});
  return`<div class="head"><p class="t2">${TODAY.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p><h1 class="greet">${hi}, <i>corretor</i>.</h1><p class="t2" style="font-size:17px;margin-top:6px">Três coisas pedem sua atenção hoje.</p></div>
  <div class="focus">${items.map((a,i)=>`<button class="fcard" data-act="cli" data-id="${a.id}" data-tab="${a.tab||'resumo'}"><span class="num">${i+1}</span><span><h3>${esc(a.h)}</h3><p>${esc(a.p)}</p></span><span class="link">${a.l}</span></button>`).join('')}</div>
  <div class="list">
    ${row(txt(`${plural(r30.length,'renovação vence','renovações vencem')} nos próximos 30 dias`,compact(r30.reduce((s,p)=>s+p.premio,0))+' em prêmio'),'','data-go="renovacoes"')}
    ${row(txt(`${RULES.reduce((s,r)=>s+r.high,0)} vendas com propensão alta`,'Sugeridas pelo motor a partir da sua carteira'),'','data-go="oportunidades"')}
  </div>
  <p class="t3 xs">Dados de exemplo gerados para a demonstração.</p>`;
};

function nextAction(c){
  const open=c.apolices.filter(p=>p.status!=='Renovada');
  const venc=open.find(p=>days(p.fim)<0);if(venc)return{t:`Renovação vencida · ${venc.ramo}`,dot:'red',act:'pol',id:venc.id};
  const soon=open.filter(p=>days(p.fim)>=0).sort((a,b)=>a.fim-b.fim)[0];
  if(soon&&days(soon.fim)<=30)return{t:`Renovar ${soon.ramo} · ${plural(days(soon.fim),'dia','dias')}`,dot:'red',act:'pol',id:soon.id};
  if(soon&&days(soon.fim)<=120&&soon.risk>=40)return{t:`Preparar renovação · ${days(soon.fim)} dias`,dot:'amber',act:'pol',id:soon.id};
  const o=c.offers.find(o=>o.prop>=70);if(o)return{t:`Oferecer ${o.rule.prod}`,dot:'green',act:'cli',id:c.id,tab:'ofertas'};
  if(c.ultContato>90)return{t:'Retomar contato',dot:'blue',act:'cli',id:c.id};
  if(soon&&days(soon.fim)<=120)return{t:`Renovar em ${days(soon.fim)} dias`,dot:'',act:'pol',id:soon.id};
  return{t:'Em dia',dot:'',mute:true,act:'cli',id:c.id};
}
const cadOk=c=>!c.missing.length||S.cad[c.id];
const DAYS_TO=c=>c.prox?days(c.prox.fim):9999;
const FILTERS=[
  {g:'tipo',l:'Tipo',main:1,o:[['pf','Pessoa física',c=>c.tipo==='PF'],['pj','Empresa',c=>c.tipo==='PJ']]},
  {g:'ramo',l:'Ramo',main:1,o:RAMOS.map(r=>[r,r,c=>c.ramos.has(r)])},
  {g:'ins',l:'Seguradora',main:1,o:INS.map(i=>[i,i,c=>c.apolices.some(p=>p.ins===i)])},
  {g:'venc',l:'Vencimento',main:1,o:[['v','Vencidas',c=>DAYS_TO(c)<0],['30','Até 30 dias',c=>DAYS_TO(c)>=0&&DAYS_TO(c)<=30],['60','31 a 60 dias',c=>DAYS_TO(c)>30&&DAYS_TO(c)<=60],['120','61 a 120 dias',c=>DAYS_TO(c)>60&&DAYS_TO(c)<=120],['mais','Acima de 120 dias',c=>DAYS_TO(c)>120]]},
  {g:'cont',l:'Último contato',main:1,o:[['30','Até 30 dias',c=>c.ultContato<=30],['90','31 a 90 dias',c=>c.ultContato>30&&c.ultContato<=90],['180','91 a 180 dias',c=>c.ultContato>90&&c.ultContato<=180],['mais','Mais de 180 dias',c=>c.ultContato>180]]},
  {g:'prod',l:'Produtos',o:[['1','1 produto',c=>c.apolices.length===1],['2','2 produtos',c=>c.apolices.length===2],['3','3 ou mais',c=>c.apolices.length>=3]]},
  {g:'rec',l:'Receita anual',o:[['a','Até R$ 1 mil',c=>c.receita<1e3],['b','R$ 1 mil a 5 mil',c=>c.receita>=1e3&&c.receita<5e3],['c','R$ 5 mil a 15 mil',c=>c.receita>=5e3&&c.receita<15e3],['d','Acima de R$ 15 mil',c=>c.receita>=15e3]]},
  {g:'cid',l:'Cidade',o:Object.keys(CID).map(x=>[x,x,c=>c.cidade===x])},
  {g:'sinal',l:'Sinais',o:[['top','20% maiores receitas',c=>c.receita>=REC_P80],['prop','Oferta com propensão alta',c=>c.offers.some(o=>o.prop>=70)],['risco','Receita em risco (120 dias)',c=>c.apolices.some(p=>p.status!=='Renovada'&&days(p.fim)<=120&&(days(p.fim)<0||p.risk>=40))],['novo','Cliente há menos de 1 ano',c=>c.desde>=TODAY.getFullYear()],['saude30','Saúde com 30+ vidas',c=>c.tipo==='PJ'&&c.vidas>=30],['cad','Cadastro incompleto',c=>!cadOk(c)],['rev','Em revisão',c=>!!S.review[c.id]]]}
];
const emptyCF=()=>Object.fromEntries(FILTERS.map(f=>[f.g,[]]));
const nActive=()=>FILTERS.reduce((n,f)=>n+S.cf[f.g].length,0);
function passCF(c){return FILTERS.every(f=>{const sel=S.cf[f.g];return!sel.length||f.o.some(([v,,t])=>sel.includes(v)&&t(c));});}
const COLS=[
  {k:'produtos',l:'Produtos',def:1,sort:c=>c.apolices.length,cell:c=>`<span class="nprod">${c.apolices.length}</span> <span class="t2 sm">${[...c.ramos].slice(0,2).join(', ')}${c.ramos.size>2?` +${c.ramos.size-2}`:''}</span>`,child:p=>`<span class="t3">prêmio ${brl(p.premio)}</span>`},
  {k:'acao',l:'Próxima ação',def:1,cell:c=>{const na=nextAction(c);return`<button class="next ${na.mute?'mute':''}" data-act="${na.act}" data-id="${na.id}" ${na.tab?`data-tab="${na.tab}"`:''}>${na.dot?`<span class="dot ${na.dot}"></span>`:''}<span>${na.t}</span></button>`},child:p=>`<span class="t3">${p.status}</span>`},
  {k:'venc',l:'Próximo vencimento',def:1,sort:c=>DAYS_TO(c),cell:c=>c.prox?`${fdate(c.prox.fim)} <span class="sm ${days(c.prox.fim)<0?'down':'t3'}">· ${days(c.prox.fim)<0?'vencido':plural(days(c.prox.fim),'dia','dias')}</span>`:'<span class="t3">—</span>',child:p=>`${fdate(p.fim)}`},
  {k:'contato',l:'Último contato',def:1,sort:c=>c.ultContato,cell:c=>`<span style="${c.ultContato>120?'color:var(--amber)':'color:var(--text-2)'}">há ${plural(c.ultContato,'dia','dias')}</span>`,child:()=>''},
  {k:'ins',l:'Seguradoras',sort:c=>c.apolices[0].ins,cell:c=>`<span class="t2">${[...new Set(c.apolices.map(p=>p.ins))].join(', ')}</span>`,child:p=>p.ins},
  {k:'premio',l:'Prêmio/ano',r:1,sort:c=>c.premio,cell:c=>brl(c.premio),child:p=>brl(p.premio)},
  {k:'cidade',l:'Cidade',sort:c=>c.cidade,cell:c=>`<span class="t2">${esc(c.cidade)}</span>`,child:()=>''},
  {k:'desde',l:'Cliente desde',r:1,sort:c=>c.desde,cell:c=>`<span class="t2">${c.desde}</span>`,child:()=>''},
  {k:'prop',l:'Melhor oferta',sort:c=>c.offers[0]?c.offers[0].prop:-1,cell:c=>c.offers[0]?`<span class="t2 sm">${esc(c.offers[0].rule.prod)}</span> ${propHTML(c.offers[0].prop)}`:'<span class="t3">—</span>',child:()=>''},
  {k:'score',l:'Score de crédito',r:1,sort:c=>c.score,cell:c=>`<span class="t2">${c.score}</span>`,child:()=>''},
  {k:'tel',l:'Telefone',cell:c=>`<span class="t2">${c.tel}</span>`,child:()=>''}
];
function carteiraHealth(){const rec=POLICIES.reduce((s,p)=>s+p.premio*p.comissao,0);
  const risk=POLICIES.filter(p=>p.status!=='Renovada'&&days(p.fim)<=120&&(days(p.fim)<0||p.risk>=40)).reduce((s,p)=>s+p.premio*p.comissao,0);
  const g={};POLICIES.forEach(p=>g[p.ins]=(g[p.ins]||0)+p.premio*p.comissao);const top=Object.entries(g).sort((a,b)=>b[1]-a[1])[0];
  return{rec,risk,top:top[0],topShare:top[1]/rec*100};}
const customerPage={items:[],total:0,page:1,page_size:15,loading:false,error:''};
const renewalGrid={items:[],total:0,page:1,page_size:15,counts:{venc:0,'30':0,'60':0,'120':0},loading:false,error:''};
let renewalRequest=0;
const renewalWindows={venc:[null,-1],'30':[0,30],'60':[31,60],'120':[61,120]};
const isoDay=offset=>{const d=new Date(TODAY.getTime()+offset*DAY);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function renewalWindowParams(key){const[from,to]=renewalWindows[key];return from===null?{end_date_to:isoDay(to)}:{end_date_from:isoDay(from),end_date_to:isoDay(to)}}
function validPage(data){return data&&Array.isArray(data.items)&&Number.isInteger(data.total)&&data.total>=0&&Number.isInteger(data.page)&&data.page>=1&&Number.isInteger(data.page_size)&&data.page_size>=1}
const policyCustomerName=policy=>policy.customer?.name||'Cliente';
async function loadRenewalPolicies(){
  if(S.view!=='renovacoes'||S.renMode!=='todas')return;
  const request=++renewalRequest,selected=S.ren;
  renewalGrid.loading=true;renewalGrid.error='';render();
  try{
    const query=new URLSearchParams({...renewalWindowParams(selected),page:String(S.renPage),page_size:'15'});
    const selectedData=await apiRequest('/policies?'+query);
    if(!validPage(selectedData))throw new Error('A API retornou uma lista de apólices inválida.');
    if(selectedData.items.some(policy=>!policy||typeof policy.id!=='string'||typeof policy.customer_id!=='string'||typeof policy.amount!=='string'||typeof policy.end_date!=='string'||Number.isNaN(Date.parse(policy.end_date)))){
      throw new Error('A API retornou dados de apólice inválidos.');
    }
    if(request!==renewalRequest)return;
    Object.assign(renewalGrid,{items:selectedData.items,total:selectedData.total,page:selectedData.page,page_size:selectedData.page_size,counts:{...renewalGrid.counts,[selected]:selectedData.total},loading:false});
    render();
    const otherKeys=Object.keys(renewalWindows).filter(key=>key!==selected);
    const countsPromise=Promise.allSettled(otherKeys.map(async key=>{
      const countQuery=new URLSearchParams({...renewalWindowParams(key),page:'1',page_size:'1'});
      const data=await apiRequest('/policies?'+countQuery);
      if(!validPage(data))throw new Error('A API retornou uma lista de apólices inválida.');
      return[key,data.total];
    }));
    const countResults=await countsPromise;
    if(request!==renewalRequest)return;
    countResults.forEach(result=>{if(result.status==='fulfilled')renewalGrid.counts[result.value[0]]=result.value[1]});
    render();
  }catch(error){
    if(request===renewalRequest){renewalGrid.items=[];renewalGrid.total=0;renewalGrid.loading=false;renewalGrid.error=error.message;render();}
  }
}
async function loadCustomers(page=1){
  if(customerPage.loading)return;
  customerPage.loading=true;customerPage.error='';S.cq='';
  if(S.view==='carteira')render();
  try{
    const query=new URLSearchParams({page:String(page),page_size:'15',view:'detailed'});
    const data=await apiRequest('/customers?'+query);
    if(!Array.isArray(data.items)||!Number.isInteger(data.total)||data.total<0||
      !Number.isInteger(data.page)||data.page<1||!Number.isInteger(data.page_size)||data.page_size<1||
      data.items.some(customer=>!customer||['id','name','customer_type','phone','email','broker_id','created_at'].some(key=>typeof customer[key]!=='string'))){
      throw new Error('A API retornou uma lista de clientes inválida.');
    }
    Object.assign(customerPage,{items:data.items,total:data.total,page:data.page,page_size:data.page_size});
  }catch(error){
    customerPage.items=[];customerPage.total=0;customerPage.error=error.message;
  }finally{
    customerPage.loading=false;
    if(S.view==='carteira')render();
  }
}
V.carteira=()=>{
  const query=norm(S.cq);
  const customers=customerPage.items.filter(customer=>!query||[customer.name,customer.phone,customer.email].some(value=>norm(value).includes(query)));
  const insurers=customer=>[...new Set((customer.policies||[])
    .map(policy=>policy?.insurer?.name)
    .filter(name=>typeof name==='string'&&name.trim()))].join(', ');
  const nextExpiry=customer=>(customer.policies||[])
    .map(policy=>policy?.end_date)
    .filter(date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date)))
    .sort()[0]||'';
  const sortKey=['name','customer_type','phone','email','insurers','end_date','created_at'].includes(S.cSort)?S.cSort:'name';
  const sortValue=customer=>sortKey==='insurers'?insurers(customer):sortKey==='end_date'?nextExpiry(customer):customer[sortKey];
  customers.sort((first,second)=>sortValue(first).localeCompare(sortValue(second),'pt-BR')*(S.cSort===sortKey?S.cDir:1));
  const column=(key,label,cls='')=>`<th class="${cls}"><button data-act="csort" data-v="${key}">${label}${S.cSort===key?(S.cDir<0?' ↓':' ↑'):''}</button></th>`;
  const products=customer=>[...new Set((customer.policies||[])
    .map(policy=>policy?.insurance_product?.insurance_branch?.name)
    .filter(name=>typeof name==='string'&&name.trim()))].join(', ');
  let rows=customers.map(customer=>`<tr class="cl" data-act="customer-details" data-id="${esc(customer.id)}" tabindex="0" aria-haspopup="dialog" aria-label="Ver detalhes de ${esc(customer.name)}">
    <td><span class="cname"><b>${esc(customer.name)}</b><span>${customer.customer_type==='BUSINESS'?'Empresa':'Pessoa física'}</span></span></td>
    <td class="hide-m">${esc(products(customer))||'—'}</td>
    <td class="hide-m">${nextExpiry(customer)?fdateY(new Date(nextExpiry(customer)+'T00:00:00')):'—'}</td>
    <td><a href="tel:${encodeURIComponent(customer.phone)}">${esc(customer.phone)||'—'}</a></td>
    <td class="hide-m"><a href="mailto:${encodeURIComponent(customer.email)}">${esc(customer.email)||'—'}</a></td>
    <td class="hide-m">${esc(insurers(customer))||'—'}</td>
    <td class="hide-m">${Number.isNaN(Date.parse(customer.created_at))?'—':fdateY(new Date(customer.created_at))}</td>
  </tr>`).join('');
  if(customerPage.loading)rows='<tr><td colspan="7" class="empty" role="status"><span class="grid-loading"><span class="spinner" aria-hidden="true"></span>Carregando clientes...</span></td></tr>';
  else if(customerPage.error)rows=`<tr><td colspan="7" class="empty"><p role="alert">${esc(customerPage.error)}</p><button class="link" data-act="customers-retry">Tentar novamente</button> · <button class="link" data-act="logout">Entrar novamente</button></td></tr>`;
  else if(!rows)rows=`<tr><td colspan="7" class="empty">${query?'Nenhum cliente encontrado nesta página.':'Nenhum cliente cadastrado.'}</td></tr>`;
  return`${head('Carteira',plural(customerPage.total,'cliente','clientes'))}
    <div class="section"><div class="tbl" aria-busy="${customerPage.loading}">
      <div class="tbar"><input class="input sm" id="cq" placeholder="Buscar nesta página" aria-label="Buscar cliente nesta página" value="${esc(S.cq)}" ${customerPage.loading?'disabled':''}></div>
      <div class="tbl-scroll"><table><thead><tr>${column('name','Cliente')}<th class="hide-m">Produtos</th>${column('end_date','Próximo Vencimento','hide-m')}${column('phone','Telefone')}${column('email','E-mail','hide-m')}${column('insurers','Corretoras','hide-m')}${column('created_at','Cadastrado em','hide-m')}</tr></thead><tbody>${rows}</tbody></table></div>
      ${pager(customerPage.total,customerPage.page,customerPage.page_size,'cpage')}
    </div></div>`;
};
function popHTML(g){const f=FILTERS.find(x=>x.g===g),sel=S.cf[g];
  return`<div class="pop-h">${f.l}${sel.length?`<button class="link sm" data-act="fclr" data-g="${g}">Limpar</button>`:''}</div><div class="pop-l">${f.o.map(([v,l,t])=>`<label class="opt"><input type="checkbox" class="ckb" data-act="fchk" data-g="${g}" data-v="${esc(v)}" ${sel.includes(v)?'checked':''}><span>${esc(l)}</span><span class="t3 sm">${CLIENTS.filter(t).length}</span></label>`).join('')}</div>`;}
function openPop(g){const b=document.querySelector(`.fpill[data-g="${g}"]`),pp=$('#pop');if(!b){pp.hidden=true;S.popG=null;return;}
  S.popG=g;pp.innerHTML=popHTML(g);pp.hidden=false;const r=b.getBoundingClientRect(),w=Math.min(280,innerWidth-24);pp.style.width=w+'px';
  pp.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+'px';
  const below=innerHeight-r.bottom-18,above=r.top-18;
  if(below>=260||below>=above){pp.style.top=(r.bottom+6)+'px';pp.style.bottom='auto';pp.style.maxHeight=Math.min(420,below)+'px';}
  else{pp.style.top='auto';pp.style.bottom=(innerHeight-r.top+6)+'px';pp.style.maxHeight=Math.min(420,above)+'px';}
  document.querySelectorAll('.fpill').forEach(x=>x.classList.toggle('open',x.dataset.g===g));}
function closePop(){if(!S.popG)return;S.popG=null;$('#pop').hidden=true;document.querySelectorAll('.fpill.open').forEach(x=>x.classList.remove('open'));}
function moreFiltersModal(){const groups=FILTERS.filter(f=>!f.main);
  openModal(`${mHead('Mais filtros','Combine quantos quiser. Dentro de um grupo vale qualquer opção marcada; entre grupos, todas as condições.')}
  <div class="m-body">${groups.map(f=>`<div class="section" style="gap:10px"><h2 style="font-size:15px">${f.l}</h2><div class="chips">${f.o.map(([v,l,t])=>`<button class="chip sm ${S.cf[f.g].includes(v)?'on':''}" data-act="ftog" data-g="${f.g}" data-v="${esc(v)}">${esc(l)} <span class="t3" style="margin-left:4px">${CLIENTS.filter(t).length}</span></button>`).join('')}</div></div>`).join('')}</div>
  <div class="m-foot"><button class="btn quiet" data-act="fmoreclr">Limpar estes filtros</button><button class="btn solid" data-act="close">Ver ${plural(CLIENTS.filter(c=>passCF(c)).length,'cliente','clientes')}</button></div>`);}
function colsModal(){openModal(`${mHead('Colunas da tabela','Cliente e receita ficam sempre visíveis. Sua escolha fica salva neste navegador.')}
  <div class="m-body"><div class="pop-l">${COLS.map(c=>`<label class="opt"><input type="checkbox" class="ckb" data-act="colchk" data-v="${c.k}" ${S.cols.includes(c.k)?'checked':''}><span>${c.l}</span></label>`).join('')}</div></div>
  <div class="m-foot"><button class="btn quiet" data-act="colreset">Restaurar padrão</button><button class="btn solid" data-act="close">Pronto</button></div>`);}

V.renovacoes=()=>{
  if(S.renMode==='saude')return`${head('Renovações','Saúde coletiva tem regras próprias: negociação por sinistralidade a partir de 30 vidas e pool de risco abaixo disso.')}${renSaude()}`;
  const actionCount=renewalGrid.counts.venc+renewalGrid.counts['30'];
  const rows=renewalGrid.items.map(policy=>{
    const endDate=new Date(`${policy.end_date}T00:00:00`),offset=Math.round((endDate-TODAY)/DAY);
    const customer=policyCustomerName(policy);
    const product=policy.insurance_product?.insurance_branch?.name||policy.insurance_product?.name||'Apólice';
    const insurer=policy.insurer?.name;
    const amount=Number(policy.amount),subtitle=`${product}${insurer?` · ${insurer}`:''}`;
    return`<tr class="cl" data-act="api-policy" data-id="${esc(policy.id)}"><td><span class="cname"><b>${esc(customer)}</b><span>${esc(subtitle)}</span></span></td><td class="hide-m">${Number.isFinite(amount)?brl2(amount):'—'}</td><td>${fdate(endDate)} <span class="sm hide-m ${offset<0?'down':'t3'}">· ${offset<0?'há '+plural(-offset,'dia','dias'):'em '+plural(offset,'dia','dias')}</span></td></tr>`;
  }).join('');
  const tableRows=renewalGrid.loading?'<tr><td colspan="3" class="empty" role="status"><span class="grid-loading"><span class="spinner" aria-hidden="true"></span>Carregando apólices...</span></td></tr>':renewalGrid.error?`<tr><td colspan="3" class="empty"><p role="alert">${esc(renewalGrid.error)}</p><button class="link" data-act="policies-retry">Tentar novamente</button></td></tr>`:rows||'<tr><td colspan="3" class="empty">Nenhuma apólice neste período.</td></tr>';
  return`${head('Renovações','A negociação começa 120 dias antes do vencimento. Abra uma apólice para preparar a renovação.')}
  <div class="section"><div class="hero"><div><div class="big">${actionCount}</div><p class="lbl">Apólices vencidas ou com vencimento nos próximos 30 dias</p></div></div></div>
  <div class="section">
    <div class="filters">${seg([['venc','Vencidas',renewalGrid.counts.venc],['30','Até 30 dias',renewalGrid.counts['30']],['60','31 a 60',renewalGrid.counts['60']],['120','61 a 120',renewalGrid.counts['120']]],S.ren,'ren')}</div>
    <div class="tbl" aria-busy="${renewalGrid.loading}"><div class="tbl-scroll"><table><thead><tr><th>Cliente</th><th class="hide-m">Prêmio atual</th><th>Vencimento</th></tr></thead><tbody>${tableRows}</tbody></table></div>${pager(renewalGrid.total,renewalGrid.page,renewalGrid.page_size,'renpage')}</div>
    <p class="t3 xs">Risco de perda combina reajuste, sinistralidade, tempo sem contato, monoproduto e tempo de casa. <button class="link xs" data-act="howrisk">Como calculamos</button></p>
  </div>`;
};

function projReaj(c){return Math.max(0,((c.sinistr/S.meta)*(1+S.vcmh/100)-1)*100)}
function renSaude(){
  const big=CLIENTS.filter(c=>c.tipo==='PJ'&&c.vidas>=30).sort((a,b)=>b.sinistr-a.sinistr),small=CLIENTS.filter(c=>c.tipo==='PJ'&&c.vidas<30);
  const meter=c=>`<span class="meter hide-m" title="Sinistralidade vs. meta"><i style="width:${Math.min(100,c.sinistr/120*100)}%;background:${c.sinistr>S.meta?'var(--red)':'var(--green)'}"></i><b style="left:${S.meta/120*100}%"></b></span>`;
  return`<div class="section"><div class="sec-h"><h2>30 vidas ou mais · reajuste negociado</h2><button class="btn" data-act="sim">Premissas: meta ${S.meta}% · VCMH ${S.vcmh}%</button></div>
  <div class="list">${big.map(c=>row(txt(esc(c.nome),`${c.vidas} vidas · ${c.apolices[0].ins} · sinistralidade ${pct(c.sinistr,0)}`),`${meter(c)}<b title="Reajuste técnico projetado">+${pct(projReaj(c))}</b>`,`data-act="cli" data-id="${c.id}"`)).join('')}</div>
  <p class="t3 xs">À direita, o reajuste técnico projetado para o próximo aniversário. A barra compara a sinistralidade com a meta (traço vertical).</p></div>
  <div class="section"><div class="sec-h"><h2>Até 29 vidas · pool de risco (RN 565)</h2></div>
  <div class="list">${Object.keys(POOL).map(ins=>{const cs=small.filter(c=>c.apolices[0].ins===ins);return cs.length?row(txt(ins,plural(cs.length,'contrato','contratos')+' no agrupamento da operadora'),`<b>${pct(POOL[ins])}</b>`,`data-act="pool" data-v="${ins}"`):''}).join('')}</div>
  <p class="t3 xs">Percentuais de pool ilustrativos. Abaixo de 30 vidas, a alavanca é a escolha da operadora, não a negociação.</p></div>`;
}

V.oportunidades=()=>{
  const tot=RULES.reduce((s,r)=>s+r.total,0),high=RULES.reduce((s,r)=>s+r.high,0);
  const rules=[...RULES].sort((a,b)=>b.high-a.high||b.total-a.total);
  return`${head('Oportunidades','O motor cruza perfil, crédito, veículo e apólices para sugerir a próxima venda. Em cada grupo, os clientes vêm do mais para o menos propenso a comprar.')}
  <div class="section"><div class="hero"><div><div class="big">${compact(tot)}</div><p class="lbl">em prêmio anual possível · ${high} vendas com propensão alta</p></div><button class="btn" data-act="sources">Como o motor funciona</button></div></div>
  <div class="section"><div class="list">${rules.map(r=>row(txt(esc(r.prod),esc(r.who)),`<span class="hide-m">${r.high?`${r.high} de ${r.items.length} com propensão alta`:plural(r.items.length,'cliente','clientes')}</span><b>${compact(r.total)}</b>`,`data-act="rule" data-v="${r.id}"`)).join('')}</div></div>`;
};

/* avisos: resumo por categoria, sem lista infinita */
V.avisos=()=>{
  const open=POLICIES.filter(p=>p.status!=='Renovada');
  const venc=open.filter(p=>days(p.fim)<0),d30=open.filter(p=>{const d=days(p.fim);return d>=0&&d<=30&&p.status==='Não iniciada'}),caro=open.filter(p=>p.reajPrev>15&&days(p.fim)>=0&&days(p.fim)<=120);
  const sin=CLIENTS.filter(c=>c.tipo==='PJ'&&c.vidas>=30&&c.sinistr>75);
  const oppH=RULES.reduce((s,r)=>s+r.high,0),semCont=CLIENTS.filter(c=>c.ultContato>120);
  const it=(dot,t,sub,attr)=>row(`<span class="dot ${dot}"></span>${txt(t,sub)}`,'',attr);
  const urgent=venc.length+d30.length;
  return`${head('Avisos','Um resumo diário por tema. Cada linha leva ao detalhe na tela certa.')}
  <div class="list">
    <div class="group-h">Precisa de ação</div>
    ${urgent?it('red',`${plural(urgent,'renovação precisa','renovações precisam')} de ação`,`${venc.length} vencidas sem renovação · ${d30.length} vencem em 30 dias sem início`,'data-act="goren"'):''}
    ${sin.length?it('red',`${plural(sin.length,'contrato de saúde','contratos de saúde')} acima da meta de sinistralidade`,'Prepare a negociação com 120 dias','data-act="gosaude"'):''}
    <div class="group-h">Acompanhar</div>
    ${caro.length?it('amber',`${plural(caro.length,'renovação','renovações')} com reajuste previsto acima de 15%`,'Nos próximos 120 dias · cote alternativas','data-act="gocaro"'):''}
    ${it('amber',`${plural(semCont.length,'cliente','clientes')} sem contato há mais de 120 dias`,'Ordenados por prêmio, com mensagem pronta','data-act="semcontato"')}
    <div class="group-h">Oportunidades</div>
    ${it('green',`${oppH} vendas com propensão alta`,compact(RULES.reduce((s,r)=>s+r.total,0))+' em prêmio anual possível','data-go="oportunidades"')}
  </div>`;
};
/* treinamento */
const MAT=['Manual de vendas','Tabela de preços','Regras de aceitação','Guia de sinistro','Condições gerais'];
const COURSES=[{t:'Renovação antecipada: o roteiro dos 120 dias',a:6,d:6},{t:'Objeção de preço no reajuste de saúde',a:4,d:2},{t:'Venda consultiva de vida para famílias',a:5,d:1},{t:'Sinistralidade e pool de risco sem mistério',a:3,d:0},{t:'Cross-sell a partir da apólice de auto',a:4,d:0}];
V.treinamento=()=>{const mats=MAT.map((m,j)=>({t:m,fmt:j===1?'XLSX':'PDF',up:new Date(TODAY.getTime()-((INS.indexOf(S.trainIns)*7+j*11)%60+2)*DAY)}));
  return`${head('Treinamento','Trilhas curtas para o time comercial e os materiais de cada seguradora parceira. Trilhas concluídas contam no indicador de Capacitação.')}
  <div class="section"><div class="sec-h"><h2>Trilhas</h2><span class="t3 sm">${COURSES.filter(c=>c.d===c.a).length} de ${COURSES.length} concluídas</span></div>
  <div class="list">${COURSES.map((c,i)=>row(txt(esc(c.t),c.d===c.a?'Concluída':`${c.d} de ${c.a} aulas`),c.d===c.a?'<span class="status"><span class="dot green"></span>Feita</span>':`<span class="link">${c.d?'Continuar':'Começar'}</span>`,`data-act="course" data-i="${i}"`)).join('')}</div></div>
  <div class="section"><div class="sec-h"><h2>Materiais por seguradora</h2></div>
  <div class="chips">${INS.map(s=>`<button class="chip ${S.trainIns===s?'on':''}" data-act="tins" data-v="${s}">${s}</button>`).join('')}</div>
  <div class="list">${mats.map(m=>`<div class="row"><span class="main">${txt(m.t,`${S.trainIns} · ${m.fmt} · atualizado em ${fdate(m.up)}`)}</span><span class="end"><button class="btn" data-act="dl">${ico('dl')}Baixar</button></span></div>`).join('')}</div></div>`;};

const EV=[[4,'Lançamento da nova linha PME 2027','SulAmérica','Online · 19h'],[9,'Workshop: renovação de saúde com sinistralidade alta','Møltz','Online · 10h'],[16,'Café com corretores parceiros','Porto','Rio de Janeiro · 9h'],[23,'Vida para famílias: produtos e aceitação','Prudential','Online · 18h30'],[31,'Encontro trimestral da rede Møltz','Møltz','Niterói · 18h'],[45,'Planejamento comercial 2027','Møltz','Online · 9h']].map(([o,t,org,f])=>({d:new Date(TODAY.getTime()+o*DAY),t,org,f}));
V.eventos=()=>{const groups={};EV.forEach((e,i)=>{const k=MONTHS_L[e.d.getMonth()];(groups[k]=groups[k]||[]).push([e,i])});
  return`${head('Eventos','Agenda das seguradoras e da rede Møltz. Presença conta no indicador de Capacitação.')}
  <div class="list">${Object.entries(groups).map(([m,xs])=>`<div class="group-h">${cap(m)}</div>`+xs.map(([e,i])=>`<div class="row"><span class="main"><span style="width:36px;text-align:center;font-weight:600;font-size:18px">${e.d.getDate()}</span>${txt(esc(e.t),`${esc(e.org)} · ${e.d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')} · ${esc(e.f)}`)}</span><span class="end">${S.events[i]?`<button class="btn" data-act="unev" data-i="${i}">${ico('check')}Inscrito</button>`:`<button class="btn" data-act="ev" data-i="${i}">Inscrever</button>`}</span></div>`).join('')).join('')}</div>`;};

/* desempenho */
const BEN={Insight:['Trilhas essenciais e assistente','Relatório mensal da carteira'],Advisor:['Mentoria comercial trimestral','Materiais com a sua marca e a da Møltz'],Partner:['10% de desconto na mensalidade','Leads qualificados de PMEs todo mês'],Private:['Gerente de sucesso dedicado','Convites VIP com seguradoras parceiras','Suporte prioritário'],Signature:['Conselho de produto da Møltz','Viagem de incentivo anual','Co-marketing em campanhas nacionais']};
V.desempenho=()=>{const P=pillars(),v=P.reduce((s,p)=>s+p.pts,0),lv=level(v),nx=nextLevel(v),li=LEVELS.indexOf(lv);
  const prog=nx?Math.round((v-lv.min)/(nx.min-lv.min)*100):100;
  const rank=[['Corretora Atlântico',884],['Vieira & Souza Seguros',812],['Prisma Corretora',731],['Você',v],['Lumen Seguros',602],['Nova Era Corretagem',548]].sort((a,b)=>b[1]-a[1]);
  let body;
  if(S.desTab==='beneficios')body=`<div class="list">${LEVELS.map((l,i)=>`<div class="row" style="${i>li?'opacity:.55':''}"><span class="main">${txt(`${l.n} <span class="t3" style="font-weight:400">· ${l.min}+ pts</span>`,BEN[l.n].join(' · '))}</span><span class="end">${i<=li?'<span class="status"><span class="dot green"></span>Liberado</span>':''}</span></div>`).join('')}</div>`;
  else if(S.desTab==='ranking')body=`<div class="list">${rank.map(([n,p],i)=>`<div class="row" style="${n==='Você'?'background:var(--green-soft)':''}"><span class="main"><span class="t3" style="width:18px">${i+1}</span><span class="ttl">${n}</span></span><span class="end">${p} · ${level(p).n}</span></div>`).join('')}</div>`;
  else body=`<div class="list">${P.map((p,i)=>`<button class="pillar" data-act="pillar" data-i="${i}"><span class="txt"><span class="ttl">${p.k}</span><span class="sub">Peso ${p.w}% · meta ${p.meta}</span></span><span class="hide-t hide-s t2 sm">${p.cur}</span><span class="hide-s"><span class="pbar"><i style="width:${Math.round(p.ratio*100)}%;${p.ratio<.6?'background:var(--amber)':''}"></i></span></span><span class="pts">${p.pts}<span class="t3 sm">/${p.w*10}</span></span>${ico('chev','chev')}</button>`).join('')}</div>`;
  return`${head('Desempenho','Índice de 0 a 1.000 pontos formado por seis indicadores da corretora. O nível considera a média dos últimos 3 meses.')}
  <div class="section"><div class="hero"><div><div class="big">${v}</div><p class="lbl">pontos · nível <b style="color:var(--text);font-weight:600">${lv.n}</b>${nx?` · faltam ${nx.min-v} para ${nx.n}`:''}</p></div></div>
  <div class="steps" style="margin-top:12px">${LEVELS.map((l,i)=>`<div class="st ${i<li?'done':''} ${i===li?'cur':''}"><i>${i<li?'✓':i+1}</i><b>${l.n}</b><span>${l.min}+ pts</span></div>`).join('')}</div></div>
  <div class="section"><div class="sec-h">${seg([['indicadores','Indicadores'],['beneficios','Benefícios'],['ranking','Ranking da rede']],S.desTab,'destab')}</div>${body}</div>`;};

/* assistente contextual: só carteira desta corretora + base estruturada de seguradoras */
const BASE=[
 {id:'reg-sinistro',fonte:'Regulação SUSEP',ins:null,tags:['prazo','sinistro','indenização','indenizacao','análise','analise','regulação','regulacao','liquidação'],texto:'A seguradora tem até 30 dias para liquidar o sinistro a partir da entrega de toda a documentação. O prazo é suspenso quando ela pede documento complementar e volta a contar na entrega.'},
 {id:'reg-carencia',fonte:'Lei 9.656/98, art. 12',ins:null,tags:['carência','carencia','exame','sangue','consulta','parto','urgência','emergência'],texto:'Carências máximas permitidas: 24 horas para urgência e emergência, 300 dias para parto a termo e 180 dias para os demais procedimentos, incluindo exames simples.'},
 {id:'reg-pool',fonte:'ANS · RN 565',ins:null,tags:['pool','30 vidas','rn 565','agrupamento','menos de 30','reajuste'],texto:'Contratos coletivos com menos de 30 vidas entram no agrupamento da operadora e recebem um reajuste único, aplicado de maio a abril no aniversário de cada contrato.'},
 {id:'reg-port',fonte:'ANS · RN 438',ins:null,tags:['portabilidade'],texto:'A portabilidade de carências exige plano de origem em dia, permanência mínima (em regra 2 anos na primeira portabilidade) e plano de destino em faixa de preço compatível.'},
 {id:'sul-car',fonte:'SulAmérica · Manual Saúde PME (exemplo)',ins:'SulAmérica',tags:['carência','carencia','exame','sangue','consulta'],texto:'[Conteúdo ilustrativo] Redução de carências contratuais para empresas a partir de 3 vidas com adesão de todo o grupo; exames simples seguem a tabela de carências reduzidas do produto.'},
 {id:'por-acc',fonte:'Porto Saúde · Regras de aceitação (exemplo)',ins:'Porto',tags:['aceitação','aceitacao','mei','vidas','mínimo','minimo'],texto:'[Conteúdo ilustrativo] Aceita PME a partir de 2 vidas, incluindo MEI com 6 meses de CNPJ ativo; titulares precisam ter vínculo comprovado com a empresa.'},
 {id:'sul-com',fonte:'SulAmérica · Contrato de corretagem (exemplo)',ins:'SulAmérica',tags:['comissão','comissao','agenciamento'],texto:'[Conteúdo ilustrativo] Agenciamento sobre as primeiras mensalidades do contrato novo e comissão recorrente sobre as mensalidades seguintes, conforme tabela vigente do contrato de corretagem.'}
];
const BASE_LOADED=[...new Set(BASE.filter(b=>b.ins).map(b=>b.ins))];
const norm=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function findIns(q){const n=norm(q);return INS.find(i=>n.includes(norm(i).split(' ')[0]))||null}
function findRamo(q){const n=norm(q);if(/vida em grupo/.test(n))return'Vida em grupo';if(/vida/.test(n))return'Vida individual';if(/odonto/.test(n))return'Odonto';if(/residen/.test(n))return'Residencial';if(/empresarial|patrimon/.test(n))return'Empresarial';if(/saude|plano/.test(n))return'Saúde PME';if(/auto|carro/.test(n))return'Auto';return null}
function findMonth(q){const n=norm(q);for(let o=-11;o<=5;o++){if(n.includes(norm(MONTHS_L[monthDate(o).getMonth()])))return o;}if(/mes passado|ultimo mes/.test(n))return -1;if(/este mes|mes atual/.test(n))return 0;return null}
function findClient(q){const n=norm(q);return scoped().find(c=>{const parts=norm(c.nome).split(' ').filter(w=>w.length>3);return parts.length&&parts.slice(0,2).every(w=>n.includes(w))})||null}
/* consultas com escopo — usadas pelo modelo (ferramentas) e pelo roteador local */
const Q={
  carteira({busca='',ramo=null,seguradora=null}={}){let cs=scoped();if(busca)cs=cs.filter(c=>norm(c.nome).includes(norm(busca)));if(ramo)cs=cs.filter(c=>c.ramos.has(ramo));if(seguradora)cs=cs.filter(c=>c.apolices.some(p=>p.ins===seguradora));
    return{total:cs.length,receita_anual:Math.round(cs.reduce((s,c)=>s+c.receita,0)),premio_anual:Math.round(cs.reduce((s,c)=>s+c.premio,0)),clientes:cs.sort((a,b)=>b.receita-a.receita).slice(0,12).map(c=>({id:c.id,nome:c.nome,perfil:persona(c),produtos:c.apolices.length,receita_anual:Math.round(c.receita)}))}},
  cliente({nome}){const c=scoped().find(x=>norm(x.nome).includes(norm(nome||'')));if(!c)return{erro:'Cliente não encontrado na carteira desta corretora.'};
    return{id:c.id,nome:c.nome,perfil:persona(c),telefone:c.tel,ultimo_contato_dias:c.ultContato,receita_anual:Math.round(c.receita),apolices:c.apolices.map(p=>({ramo:p.ramo,seguradora:p.ins,premio:p.premio,vence_em_dias:days(p.fim),status:p.status,reajuste_previsto_pct:+p.reajPrev.toFixed(1),risco:p.risk})),ofertas:c.offers.map(o=>({produto:o.rule.prod,motivo:o.rule.who,propensao:o.prop,valor_anual:o.valor}))}},
  renovacoes({ate_dias=30,de_dias=0,apenas_risco_alto=false}={}){let ps=scoped().flatMap(c=>c.apolices).filter(p=>p.status!=='Renovada'&&days(p.fim)>=de_dias&&days(p.fim)<=ate_dias);if(apenas_risco_alto)ps=ps.filter(p=>p.risk>=70);
    return{total:ps.length,premio_total:Math.round(ps.reduce((s,p)=>s+p.premio,0)),itens:ps.sort((a,b)=>a.fim-b.fim).slice(0,12).map(p=>({id:p.cli.id,cliente:p.cli.nome,ramo:p.ramo,seguradora:p.ins,vence_em_dias:days(p.fim),reajuste_previsto_pct:+p.reajPrev.toFixed(1),risco:p.risk,status:p.status}))}},
  oportunidades({produto=null}={}){let it=scoped().flatMap(c=>c.offers.map(o=>({c,o})));if(produto)it=it.filter(x=>norm(x.o.rule.prod).includes(norm(produto)));
    return{total:it.length,itens:it.sort((a,b)=>b.o.prop-a.o.prop).slice(0,10).map(x=>({id:x.c.id,cliente:x.c.nome,produto:x.o.rule.prod,motivo:x.o.rule.who,propensao:x.o.prop,valor_anual:x.o.valor}))}},
  comissoes({mes_offset=-1}={}){const o=Math.max(-11,Math.min(5,mes_offset)),mine=new Set(scoped().map(c=>c.id)),rows=cm(o).filter(x=>mine.has(x.p.cli.id));const g={};rows.forEach(x=>{g[x.p.ins]=(g[x.p.ins]||0)+(o>0?x.prev:(x.pago||0))});
    return{mes:mFull(o),previsto:Math.round(rows.reduce((s,x)=>s+x.prev,0)),recebido:o>0?null:Math.round(rows.reduce((s,x)=>s+(x.pago||0),0)),divergencias:rows.filter(x=>x.st==='div').length,por_seguradora:Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({seguradora:k,valor:Math.round(v)}))}},
  base({tema='',seguradora=null}={}){const n=norm(tema);let hits=BASE.filter(b=>b.tags.some(t=>n.includes(norm(t))));const sp=seguradora?hits.filter(b=>b.ins===seguradora):[];const reg=hits.filter(b=>!b.ins);
    return{seguradora_consultada:seguradora,manual_da_seguradora_na_base:seguradora?BASE_LOADED.includes(seguradora):null,trechos:[...sp,...reg].map(b=>({fonte:b.fonte,texto:b.texto}))}}
};
const TOOLDEFS=[
 {name:'consultar_carteira',description:'Lista clientes da carteira DESTA corretora (máx. 12, por receita) e totais. Filtros opcionais: busca por nome, ramo, seguradora.',inputSchema:{type:'object',properties:{busca:{type:'string'},ramo:{type:'string',enum:RAMOS},seguradora:{type:'string',enum:INS}}},run:i=>Q.carteira(i),src:()=>'Sua carteira'},
 {name:'detalhe_cliente',description:'Dados de um cliente desta corretora: perfil, apólices, vencimentos, risco e ofertas com propensão.',inputSchema:{type:'object',properties:{nome:{type:'string'}},required:['nome']},run:i=>Q.cliente(i),src:r=>r.nome?`Cliente · ${r.nome}`:'Sua carteira'},
 {name:'renovacoes',description:'Renovações em aberto desta corretora numa janela de dias até o vencimento (negativo = vencidas).',inputSchema:{type:'object',properties:{de_dias:{type:'number'},ate_dias:{type:'number'},apenas_risco_alto:{type:'boolean'}}},run:i=>Q.renovacoes(i),src:()=>'Renovações'},
 {name:'oportunidades',description:'Oportunidades do motor para clientes desta corretora, ordenadas por propensão (0–100). Filtro opcional por produto.',inputSchema:{type:'object',properties:{produto:{type:'string'}}},run:i=>Q.oportunidades(i),src:()=>'Motor de oportunidades'},
 {name:'comissoes',description:'Comissões desta corretora em um mês. mes_offset: 0 = mês atual, -1 = mês passado, 1 = próximo mês.',inputSchema:{type:'object',properties:{mes_offset:{type:'number'}}},run:i=>Q.comissoes(i),src:r=>`Comissões · ${r.mes}`},
 {name:'base_seguradoras',description:'Consulta a base estruturada da Møltz: regulação (SUSEP, ANS) e manuais de seguradoras já carregados. Informe o tema e, se houver, a seguradora.',inputSchema:{type:'object',properties:{tema:{type:'string'},seguradora:{type:'string',enum:INS}},required:['tema']},run:i=>Q.base(i),src:r=>r.trechos.length?r.trechos.map(t=>t.fonte).join(' + '):'Base de seguradoras'}
];
/* Roteador local: responde sem modelo, usando as mesmas consultas */
function localAnswer(q){const n=norm(q),srcs=[];let t='';
  const cli=findClient(q),ins=findIns(q),mo=findMonth(q),ramo=findRamo(q);
  if(/carencia|sinistro|portabilidade|pool|rn 565|aceitacao|agenciamento|prazo/.test(n)){
    const r=Q.base({tema:q,seguradora:ins});
    if(!r.trechos.length)return{t:'Não encontrei esse tema na base de seguradoras da Møltz. Envie o manual da seguradora para que ele passe a ser consultado.',srcs:['Base de seguradoras']};
    t=(ins&&!r.manual_da_seguradora_na_base?`O manual da ${ins} ainda não foi carregado na base, então não há regra específica dela. O que consta na base:\n\n`:'')+r.trechos.map(x=>`${x.texto}`).join('\n\n');
    return{t,srcs:r.trechos.map(x=>x.fonte)};}
  if(cli){const r=Q.cliente({nome:cli.nome}),p=r.apolices.sort((a,b)=>a.vence_em_dias-b.vence_em_dias)[0];
    t=`${r.nome} (${r.perfil}) tem ${plural(r.apolices.length,'produto','produtos')} e gera ${brl(r.receita_anual)} de receita por ano. O próximo vencimento é ${p.ramo.toLowerCase()} na ${p.seguradora}, ${p.vence_em_dias<0?'vencido há '+plural(-p.vence_em_dias,'dia','dias'):'em '+plural(p.vence_em_dias,'dia','dias')}, com reajuste previsto de ${pct(p.reajuste_previsto_pct,0)}.`+(r.ofertas.length?` Melhor oferta: ${r.ofertas[0].produto}, propensão ${r.ofertas[0].propensao}/100.`:'')+` Último contato há ${plural(r.ultimo_contato_dias,'dia','dias')}.`;
    return{t,srcs:[`Cliente · ${r.nome}`],cli:r.id};}
  if(/renova|vence|vencid/.test(n)){const m=n.match(/(\d{2,3})\s*dias/),ate=m?+m[1]:30,venc=/vencid/.test(n);const r=venc?Q.renovacoes({de_dias:-999,ate_dias:-1}):Q.renovacoes({ate_dias:ate,apenas_risco_alto:/risco/.test(n)});
    t=`${venc?'Há':'Nos próximos '+ate+' dias, há'} ${plural(r.total,'renovação','renovações')} em aberto${venc?' vencidas':''}, somando ${brl(r.premio_total)} em prêmio.`+(r.itens.length?'\n\n'+r.itens.slice(0,6).map(x=>`• ${x.cliente}: ${x.ramo} na ${x.seguradora}, ${x.vence_em_dias<0?'venceu há '+(-x.vence_em_dias)+' dias':'em '+x.vence_em_dias+' dias'}, risco ${riskWord(x.risco)[0].toLowerCase()}`).join('\n'):'');
    return{t,srcs:['Renovações']};}
  if(/comiss|recebi|receb/.test(n)){const r=Q.comissoes({mes_offset:mo??-1});
    t=r.recebido==null?`A comissão prevista para ${r.mes} é ${brl(r.previsto)}.`:`Em ${r.mes}, a comissão prevista foi ${brl(r.previsto)} e a recebida, ${brl(r.recebido)}${r.divergencias?`, com ${plural(r.divergencias,'lançamento divergente','lançamentos divergentes')}`:''}. Maior pagadora: ${r.por_seguradora[0].seguradora} (${brl(r.por_seguradora[0].valor)}).`;
    return{t,srcs:[`Comissões · ${r.mes}`]};}
  if(/propens|oportunidad|oferecer|vender|cross/.test(n)){const r=Q.oportunidades({produto:ramo});
    t=r.itens.length?`${ramo?`Para ${ramo.toLowerCase()}, as`:'As'} oportunidades de maior propensão são:\n\n`+r.itens.slice(0,5).map(x=>`• ${x.cliente}: ${x.produto}, propensão ${x.propensao}/100, ${brl(x.valor_anual)}/ano`).join('\n'):'Não há oportunidades do motor para esse produto na sua carteira.';
    return{t,srcs:['Motor de oportunidades']};}
  if(/cliente|carteira|quantos|receita|premio/.test(n)){const r=Q.carteira({ramo,seguradora:ins});
    t=`${ins||ramo?`Com ${[ramo,ins].filter(Boolean).join(' na ')}, você tem`:'Sua carteira tem'} ${plural(r.total,'cliente','clientes')}, ${brl(r.premio_anual)} em prêmio anual e ${brl(r.receita_anual)} em receita de comissões. Maiores receitas: ${r.clientes.slice(0,3).map(c=>c.nome).join(', ')}.`;
    return{t,srcs:['Sua carteira']};}
  return{t:'Não encontrei isso na sua carteira nem na base de seguradoras. Posso responder sobre seus clientes, renovações, oportunidades, comissões e sobre as regras que constam na base.',srcs:[]};}
const SUGG=['Quais renovações vencem nos próximos 30 dias?','Quem tem maior propensão para vida individual?','Quanto recebi de comissão em setembro?','Qual a carência para exame de sangue na SulAmérica?','Qual o prazo para análise de sinistro na Justos?'];
const srcHTML=m=>m.role==='user'||m.pending?'':`<div class="srcs">${m.srcs&&m.srcs.length?m.srcs.map(x=>`<span>${esc(x)}</span>`).join(''):'<span class="none">Nenhuma fonte encontrada</span>'}</div>`;
V.assistente=()=>`<div class="chat">
  <div class="scope"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg><span>Respostas baseadas só na <b>carteira da ${esc(SESSION.nome)}</b> e na <b>base de seguradoras da Møltz</b>. Sem internet e sem acesso a dados de outras corretoras. <button class="link sm" data-act="privacy">Como protegemos seus dados</button></span></div>
  ${S.chat.length?'':`<div class="head" style="margin-top:2vh"><h1 class="greet" style="font-size:44px!important">Pergunte sobre a <i>sua carteira</i>.</h1></div><div class="chips">${SUGG.map(x=>`<button class="chip" data-act="ask" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}
  <div class="msgs" id="msgs">${S.chat.map(m=>`<div class="msg ${m.role==='user'?'me':'bot'}"><span class="body">${esc(m.content)}</span>${srcHTML(m)}${m.cli?`<div style="margin-top:8px"><button class="link sm" data-act="cli" data-id="${m.cli}">Abrir cliente</button></div>`:''}</div>`).join('')}</div>
  <form class="composer" id="chatForm"><textarea id="chatIn" placeholder="Pergunte sobre clientes, renovações, comissões ou regras das seguradoras" aria-label="Pergunta"></textarea><button class="btn solid" type="submit" aria-label="Enviar">${ico('send')}</button></form></div>`;
function privacyModal(){openModal(`${mHead('Como protegemos seus dados','O assistente enxerga só o que pertence à sua corretora.')}
  <div class="m-body"><div class="mini">
  ${[['Isolamento por corretora','Toda consulta é filtrada pelo identificador da corretora no servidor, com regra de acesso por linha no banco de dados. Uma corretora nunca lê clientes, carteira, comissões ou sugestões de outra.'],
     ['Contexto mínimo para a IA','O modelo não tem acesso direto ao banco. Ele só recebe o resultado das consultas feitas nesta sessão, já filtradas pela sua corretora.'],
     ['Sem conhecimento externo','O assistente não pesquisa na internet. Responde com sua carteira e com a base estruturada da Møltz (regulação e manuais de seguradoras carregados), sempre citando a fonte.'],
     ['Sem memória entre conversas','Cada conversa começa do zero. Nada do que você pergunta é usado para treinar modelos ou para responder outra corretora.'],
     ['Auditoria','Cada consulta fica registrada com usuário, horário e dados acessados, conforme a LGPD.']].map(([t,d])=>`<div class="r"><span><b style="font-weight:500">${t}</b><br><span class="t2 sm">${d}</span></span></div>`).join('')}
  </div><p class="t3 xs">Nesta demonstração o filtro por corretora roda no navegador com dados de exemplo; em produção ele roda no servidor.</p></div>`,{wide:true});}

/* ===================== MODAIS ===================== */
let lastFocus=null;
function openModal(html,{wide=false}={}){const m=$('#modal'),was=m.classList.contains('on');m.dataset.kind='';if(!was)lastFocus=document.activeElement;m.className='modal'+(wide?' wide':'')+(was?' on':'');m.innerHTML=html;m.querySelector('.m-body')&&(m.querySelector('.m-body').scrollTop=0);
  requestAnimationFrame(()=>{m.classList.add('on');$('#scrim').classList.add('on');if(!was){const f=m.querySelector('.x');f&&f.focus({preventScroll:true});}});}
function closeModal(){const m=$('#modal');if(!m.classList.contains('on'))return;m.classList.remove('on');$('#scrim').classList.remove('on');lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true});}
const mHead=(t,s,extra='')=>`<div class="m-head"><h2>${t}</h2>${s?`<p class="t2">${s}</p>`:''}${extra}<button class="ic-btn x" data-act="close" aria-label="Fechar">${ico('x')}</button></div>`;
const demoNote='';

function customerModal(id,tab='resumo'){
  const customer=customerPage.items.find(item=>item.id===id);
  if(!customer)return;
  const formatDate=value=>{
    if(typeof value!=='string'||Number.isNaN(Date.parse(value)))return '—';
    return fdateY(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T00:00:00':value));
  };
  const policies=customer.policies||[];
  const activeTab=tab==='apolices'?'apolices':'resumo';
  const tabs=[['resumo','Resumo'],['apolices',`Apólices · ${policies.length}`]];
  const productNames=[...new Set(policies.map(policy=>policy?.insurance_product?.insurance_branch?.name).filter(Boolean))];
  const insurerNames=[...new Set(policies.map(policy=>policy?.insurer?.name).filter(Boolean))];
  const policyRows=policies.map(policy=>{
    const product=policy?.insurance_product;
    const amount=policy?.amount;
    const value=typeof amount==='string'&&amount.trim()&&Number.isFinite(Number(amount))?brl2(Number(amount)):'—';
    return`<div class="row">
      <span class="main"><span class="txt">
        <span class="ttl">${esc(product?.name||product?.insurance_branch?.name||'Apólice')}</span>
        <span class="sub">${esc(product?.insurance_branch?.name||'—')} · ${esc(policy?.insurer?.name||'—')}</span>
        <span class="sub">Apólice ${esc(policy?.policy_number||'—')}</span>
        <span class="sub">${formatDate(policy?.start_date)} → ${formatDate(policy?.end_date)}</span>
        <span class="sub">${esc(policy?.status||'—')}</span>
      </span></span>
      <span class="end"><b>${esc(value)}</b></span>
    </div>`;
  }).join('');
  const phone=(customer.phone||'').trim();
  let whatsappPhone=phone.replace(/\D/g,'');
  if(phone.startsWith('00'))whatsappPhone=whatsappPhone.slice(2);
  else if(!phone.startsWith('+')&&/^\d{10,11}$/.test(whatsappPhone))whatsappPhone='55'+whatsappPhone;
  const message=`Olá, ${customer.name}! Tudo bem? Podemos conversar sobre seus seguros?`;
  const whatsapp=/^[1-9]\d{7,14}$/.test(whatsappPhone)
    ?`<a class="btn wa-o" href="https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer" aria-label="Enviar WhatsApp para ${esc(customer.name)}">${WA_SVG}WhatsApp</a>`
    :`<button class="btn wa-o" disabled title="Telefone indisponível ou inválido">${WA_SVG}WhatsApp</button>`;
  const contacts=`<div class="contact customer-contact">${customer.phone?`<a href="tel:${encodeURIComponent(customer.phone)}">${esc(customer.phone)}</a>`:''}${customer.email?`<a href="mailto:${encodeURIComponent(customer.email)}">${esc(customer.email)}</a>`:''}<span>Cadastrado em ${formatDate(customer.created_at)}</span>${whatsapp}</div>`;
  const summary=`<div class="mini">${[['Apólices',policies.length],['Produtos',productNames.join(', ')||'—'],['Seguradoras',insurerNames.join(', ')||'—']]
    .map(([label,value])=>`<div class="r"><span>${label}</span><span>${esc(value)}</span></div>`).join('')}</div>`;
  openModal(`${mHead(esc(customer.name),customer.customer_type==='BUSINESS'?'Empresa':'Pessoa física',contacts)}
    <div class="m-tabs">${tabs.map(([key,label])=>`<button class="${activeTab===key?'on':''}" data-act="customer-tab" data-id="${esc(customer.id)}" data-v="${key}">${label}</button>`).join('')}</div>
    <div class="m-body customer-details">${activeTab==='resumo'?summary:policyRows?`<div class="list customer-policy-list">${policyRows}</div>`:'<p class="empty">Nenhuma apólice cadastrada.</p>'}</div>
    <div class="m-foot"><button class="btn quiet" data-act="close">Fechar</button></div>`);
}

function clientModal(id,tab){
  const c=byId(id);if(!c)return;const t=tab||'resumo';
  const tabs=[['resumo','Resumo'],['apolices',`Apólices · ${c.apolices.length}`],['ofertas',`Ofertas${c.offers.length?' · '+c.offers.length:''}`],['roteiro','Roteiro']];
  const worst=[...c.apolices].sort((a,b)=>b.risk-a.risk)[0];let body='';
  if(t==='resumo'){
    const facts=c.tipo==='PF'?[['Idade',c.idade+' anos'],['Estado civil',c.ec],['Dependentes',c.dep],['Profissão',c.prof],['Score de crédito',c.score],['Classe social',c.classe],['Veículo',c.veic?`${c.veic.m} ${c.veic.ano} · ${c.veic.l} lugares`:'Sem veículo'],['Imóvel próprio',c.casaPropria?'Sim':'Não'],['Cliente desde',c.desde],['Último contato',`há ${plural(c.ultContato,'dia','dias')}`]]
      :[['Vidas',c.vidas],['Sócios',c.socios],['Regra de reajuste',c.vidas>=30?'Negociado por sinistralidade':'Pool de risco (RN 565)'],['Sinistralidade 12 meses',pct(c.sinistr)],['Score de crédito',c.score],['Cliente desde',c.desde],['Último contato',`há ${plural(c.ultContato,'dia','dias')}`]];
    body=`<div class="mini"><div class="r"><span>Receita anual para a corretora</span><span><b>${brl(c.receita)}</b></span></div><div class="r"><span>Prêmio anual</span><span>${brl(c.premio)}</span></div><div class="r"><span>Produtos</span><span>${c.apolices.length}</span></div></div>
    <dl class="dl">${facts.map(([k,v])=>`<div><dt>${k}</dt><b>${esc(v)}</b></div>`).join('')}</dl>
    <div class="note"><b>Risco de perda ${riskWord(worst.risk)[0].toLowerCase()}</b> (${worst.risk} de 100) na renovação de ${worst.ramo.toLowerCase()}.${worst.parts.length?' '+worst.parts.map((p,i)=>i?p[0][0].toLowerCase()+p[0].slice(1):p[0]).join(', ')+'.':''}</div>`;
  }else if(t==='apolices'){
    body=`<div class="mini">${c.apolices.map(p=>`<div class="r"><span>${p.ramo} · ${p.ins}<br><span class="t3 sm">${p.id} · vence em ${fdateY(p.fim)} · ${p.status.toLowerCase()} · reajuste previsto ${pct(p.reajPrev,0)}</span></span><span>${brl(p.premio)}<br><span class="t3 sm">receita ${brl(p.premio*p.comissao)}</span></span></div>`).join('')}</div>`;
  }else if(t==='ofertas'){
    body=c.offers.length?c.offers.map(o=>`<div class="section" style="gap:8px"><div class="sec-h"><h2 style="font-size:17px">${esc(o.rule.prod)}</h2><span style="display:flex;gap:14px;align-items:center">${propHTML(o.prop)}<b>${brl(o.valor)}/ano</b></span></div><p class="t2">${esc(o.rule.why)}</p>
      <div class="mini">${o.parts.map(([k,v,m])=>`<div class="r sm"><span class="t2">${k}</span><span>${v}/${m}</span></div>`).join('')}<div class="r total sm"><span>Propensão</span><span>${o.prop}/100</span></div></div></div>`).join('<hr style="border:0;border-top:1px solid var(--line);margin:0">'):'<p class="t2">Nenhuma regra do motor se aplica a este cliente agora.</p>';
  }else body=`<div id="scriptOut" class="script t2">Gere um roteiro de ligação com base no perfil, nas apólices e na melhor oferta deste cliente.</div>`;
  const ctx=t==='ofertas'&&c.offers[0]?{o:c.offers[0]}:(c.prox&&days(c.prox.fim)<=120?{p:c.prox}:null);
  openModal(`${mHead(esc(c.nome),esc(persona(c)),contactHTML(c,ctx))}
  <div class="m-tabs">${tabs.map(([k,l])=>`<button class="${t===k?'on':''}" data-act="mtab" data-v="${k}" data-id="${c.id}">${l}</button>`).join('')}</div>
  <div class="m-body">${body}</div>
  <div class="m-foot">${demoNote}<button class="btn" data-act="contact" data-id="${c.id}">Registrar contato</button><button class="btn solid" data-act="script" data-id="${c.id}">Gerar roteiro</button></div>`);
}
function policyModal(id){
  const p=POLICIES.find(x=>x.id===id),c=p.cli,[w,col]=riskWord(p.risk),d=days(p.fim);
  const steps=[['Revisar o uso no último ano',p.status!=='Não iniciada'],['Cotar ao menos duas alternativas',['Cotando','Em negociação'].includes(p.status)],['Apresentar a proposta ao cliente',p.status==='Em negociação'],['Confirmar a renovação',false]];
  openModal(`${mHead(`${p.ramo} · ${esc(c.nome)}`,`${p.ins} · ${p.id} · ${d<0?'venceu há '+plural(-d,'dia','dias'):'vence em '+fdateY(p.fim)+' ('+plural(d,'dia','dias')+')'}`,contactHTML(c,{p}))}
  <div class="m-body">
    <dl class="dl"><div><dt>Prêmio atual</dt><b>${brl(p.premio)}</b></div><div><dt>Reajuste previsto</dt><b>${pct(p.reajPrev,0)} · ${brl(p.premio*(1+p.reajPrev/100))}</b></div><div><dt>Receita anual da apólice</dt><b>${brl(p.premio*p.comissao)}</b></div><div><dt>Risco de perda</dt><b><span class="status" style="color:var(--text)"><span class="dot ${col}"></span>${w} · ${p.risk} de 100</span></b></div></dl>
    ${p.parts.length?`<div class="mini">${p.parts.map(([t,v])=>`<div class="r"><span>${t}</span><span class="t2">+${v}</span></div>`).join('')}<div class="r total"><span>Score de risco</span><span>${p.risk}</span></div></div>`:''}
    <div class="section" style="gap:8px"><h2 style="font-size:16px">Checklist da renovação</h2>${steps.map(([t,ok],i)=>`<label style="display:flex;gap:10px;align-items:center" for="ck${i}"><input id="ck${i}" type="checkbox" ${ok?'checked':''} style="accent-color:var(--green);width:18px;height:18px"> ${t}</label>`).join('')}</div>
  </div>
  <div class="m-foot">${demoNote}<button class="btn" data-act="cli" data-id="${c.id}">Ver cliente</button><button class="btn solid" data-act="renew" data-id="${p.id}">Marcar como renovada</button></div>`);
}
function apiPolicyModal(id){
  const policy=renewalGrid.items.find(item=>item.id===id);if(!policy)return;
  const customer=policyCustomerName(policy);
  const product=policy.insurance_product?.name||policy.insurance_product?.insurance_branch?.name||'Apólice';
  const amount=Number(policy.amount),formatDate=value=>typeof value==='string'&&!Number.isNaN(Date.parse(value))?fdateY(new Date(`${value.slice(0,10)}T00:00:00`)):'—';
  openModal(`${mHead(esc(customer),esc(product))}<div class="m-body"><dl class="dl"><div><dt>Seguradora</dt><b>${esc(policy.insurer?.name||'—')}</b></div><div><dt>Prêmio</dt><b>${Number.isFinite(amount)?brl2(amount):'—'}</b></div><div><dt>Número da apólice</dt><b>${esc(policy.policy_number||'—')}</b></div><div><dt>Status</dt><b>${esc(policy.status||'—')}</b></div><div><dt>Início</dt><b>${formatDate(policy.start_date)}</b></div><div><dt>Vencimento</dt><b>${formatDate(policy.end_date)}</b></div></dl></div><div class="m-foot"><button class="btn quiet" data-act="close">Fechar</button></div>`);
}
function ruleModal(id){const r=RULES.find(x=>x.id===id);
  openModal(`${mHead(esc(r.prod),`${esc(r.who)} · ${plural(r.items.length,'cliente','clientes')} · ${compact(r.total)} por ano`)}
  <div class="m-body"><div class="note"><b>Por que funciona.</b> ${esc(r.why)}<br><span class="t3 sm">Origem do dado: ${esc(r.src)} · ordenado por propensão de compra</span></div>
  <div class="list">${r.items.map(({c,o})=>`<div class="row click" data-act="cli" data-id="${c.id}" data-tab="ofertas"><span class="main">${txt(esc(c.nome),esc(persona(c))+' · '+c.tel)}</span><span class="end">${propHTML(o.prop)}<b class="hide-m">${brl(o.valor)}</b>${waBtn(c,{o},true)}</span></div>`).join('')}</div></div>
  `,{wide:true});}
function extratoModal(ins){const o=S.comMonth,rows=cm(o).filter(x=>x.p.ins===ins),prev=rows.reduce((s,x)=>s+x.prev,0),pago=rows.reduce((s,x)=>s+(x.pago||0),0),ret=pago*RET;
  openModal(`${mHead(`${ins} · ${mFull(o)}`,`${plural(rows.length,'apólice','apólices')} no extrato`)}
  <div class="m-body"><div class="mini"><div class="r"><span>Comissão prevista</span><span>${brl2(prev)}</span></div><div class="r"><span>Comissão paga</span><span>${o>0?'—':brl2(pago)}</span></div>${o<=0?`<div class="r"><span class="t2">Retenções na fonte (ilustrativo, 5%)</span><span class="t2">− ${brl2(ret)}</span></div><div class="r total"><span>Líquido recebido</span><span>${brl2(pago-ret)}</span></div>`:''}</div>
  <div class="list">${rows.sort((a,b)=>b.prev-a.prev).map(x=>{const st=x.risco?['Depende de renovação','amber']:x.st==='div'?['Pago a menos','red']:x.st==='pend'?['Pendente','blue']:x.st==='prev'?['Previsto','blue']:['Conciliado','green'];
    return`<div class="row click" data-act="cli" data-id="${x.p.cli.id}"><span class="main">${txt(esc(x.p.cli.nome),`${x.p.ramo} · ${x.tipo} · base ${brl(x.base)} × ${pct(x.p.comissao*100)}`)}</span><span class="end"><span class="status hide-m"><span class="dot ${st[1]}"></span>${st[0]}</span><b>${brl(x.pago??x.prev)}</b></span></div>`}).join('')}</div>
  <p class="t3 xs">Percentuais de retenção configuráveis conforme município e regime tributário da corretora.</p></div>`,{wide:true});}
function divModal(pid,m){const x=cm(+m).find(y=>y.p.id===pid),k='ct'+pid+m;
  openModal(`${mHead('Comissão paga a menos',`${esc(x.p.cli.nome)} · ${x.p.ramo} · ${x.p.ins} · ${mFull(+m)}`)}
  <div class="m-body"><div class="mini"><div class="r"><span>Base de cálculo (parcela)</span><span>${brl2(x.base)}</span></div><div class="r"><span>Percentual contratado</span><span>${pct(x.p.comissao*100)}</span></div><div class="r"><span>Comissão prevista</span><span>${brl2(x.prev)}</span></div><div class="r"><span>Comissão paga</span><span>${brl2(x.pago)}</span></div><div class="r total"><span>Diferença</span><span style="color:var(--red)">− ${brl2(x.prev-x.pago)}</span></div></div>
  <div class="note">Causas comuns: percentual diferente do contrato de corretagem, endosso que mudou o prêmio ou parcela paga com atraso pelo cliente. Confira o extrato do portal da seguradora antes de contestar.</div></div>
  <div class="m-foot">${S.done[k]?'<span class="status"><span class="dot green"></span>Contestação registrada</span>':`<button class="btn solid" data-act="contest" data-k="${k}">Registrar contestação</button>`}</div>`);}
function simModal(){openModal(`${mHead('Premissas de reajuste','Usadas para projetar o reajuste técnico dos contratos com 30 vidas ou mais.')}
  <div class="m-body"><div class="slider"><div class="top-l"><label for="slMeta">Meta de sinistralidade</label><b id="vMeta">${S.meta}%</b></div><input id="slMeta" type="range" min="60" max="85" value="${S.meta}"></div>
  <div class="slider"><div class="top-l"><label for="slVcmh">Inflação médica projetada (VCMH)</label><b id="vVcmh">${S.vcmh}%</b></div><input id="slVcmh" type="range" min="5" max="20" value="${S.vcmh}"></div>
  <div class="note">Reajuste técnico = (sinistralidade ÷ meta) × (1 + VCMH) − 1.<br><span class="t3 sm">Referências: sinistralidade média do setor de 81,7% em 2025 (ANS); meta de 75% proposta pela ANS para contratos empresariais.</span></div></div>
  <div class="m-foot"><button class="btn solid" data-act="close">Aplicar</button></div>`);}
function poolModal(ins){const cs=CLIENTS.filter(c=>c.tipo==='PJ'&&c.vidas<30&&c.apolices[0].ins===ins);
  openModal(`${mHead(`Pool ${ins}: ${pct(POOL[ins])}`,'Reajuste único do agrupamento de contratos com menos de 30 vidas, aplicado de maio a abril no aniversário de cada contrato.')}
  <div class="m-body"><div class="list">${cs.map(c=>row(txt(esc(c.nome),`${c.vidas} vidas · aniversário ${fdate(c.apolices[0].fim)}`),`<b>${brl(c.apolices[0].premio*(1+POOL[ins]/100))}</b>`,`data-act="cli" data-id="${c.id}"`)).join('')}</div><p class="t3 xs">À direita, o prêmio anual após o reajuste do pool.</p></div>`);}
function semContatoModal(){const cs=CLIENTS.filter(c=>c.ultContato>120).sort((a,b)=>b.premio-a.premio);
  openModal(`${mHead('Clientes sem contato há 120+ dias','Ordenados por prêmio. Um contato curto agora reduz o risco na próxima renovação.')}
  <div class="m-body"><div class="list">${cs.map(c=>`<div class="row click" data-act="cli" data-id="${c.id}"><span class="main">${txt(esc(c.nome),`há ${c.ultContato} dias · ${c.tel}`)}</span><span class="end"><b class="hide-m">${brl(c.premio)}</b>${waBtn(c,null,true)}</span></div>`).join('')}</div></div>`,{wide:true});}
function sourcesModal(){const L=[['Questionário de risco do auto','Idade, sexo, estado civil, profissão, tempo de CNH e CEP de pernoite','Disponível na apólice'],['APIs das seguradoras','Apólices, vigências, prêmios, veículo, condutores e relação de vidas','A conectar'],['Open Insurance','Cadastro, apólices e históricos de sinistros e pagamentos, com consentimento','Com consentimento'],['Relatório da operadora','Sinistralidade, faixa etária e reajustes de saúde','Envio mensal'],['Bureau de crédito','Score e faixa de renda, com base legal e consentimento (LGPD)','Validar com jurídico'],['Cadastro do corretor','Dependentes, imóvel próprio, CNPJ, eventos de vida e contatos','Ativo']];
  openModal(`${mHead('Como o motor funciona','Cada sugestão vem de uma regra explícita. Dentro da regra, os clientes são ordenados por propensão de compra.')}
  <div class="m-body"><div class="section" style="gap:6px"><h2 style="font-size:16px">Propensão de compra (0 a 100)</h2><p class="t2 sm">Combina o modelo RFM (recência, frequência e valor) com sinais de perfil, histórico de compra e eventos de vida usados em modelos de cross-sell de seguros.</p></div>
  <div class="mini">${[['Aderência ao gatilho da regra',30],['Contato recente (recência)',20],['Relacionamento: tempo de casa e nº de produtos (frequência)',15],['Valor do cliente na carteira (valor)',15],['Capacidade de pagamento (score de crédito)',10],['Momento: renovação em até 90 dias ou evento de vida',10]].map(([t,p])=>`<div class="r"><span>${t}</span><span>${p}</span></div>`).join('')}</div>
  <div class="note">Alta a partir de 70 · média de 50 a 69 · baixa abaixo de 50. Os pesos são o ponto de partida e serão calibrados com as vendas fechadas dos pilotos.</div>
  <div class="section" style="gap:6px"><h2 style="font-size:16px">Fontes de dados</h2></div><div class="mini">${L.map(([t,d,s])=>`<div class="r"><span><b style="font-weight:500">${t}</b><br><span class="t2 sm">${d}</span></span><span class="t3 sm">${s}</span></div>`).join('')}</div></div>`,{wide:true});}
function riskModal(){openModal(`${mHead('Como calculamos o risco de perda','Soma de sinais da carteira, de 0 a 100.')}<div class="m-body"><div class="mini">${[['Reajuste previsto acima de 15%',25],['Sinistralidade acima de 75% (30+ vidas)',25],['Sem contato há mais de 90 dias',20],['Cliente com um único produto',10],['Cliente há menos de 2 anos',10],['Entre os 20% maiores da carteira (prioridade)',10]].map(([t,p])=>`<div class="r"><span>${t}</span><span>+${p}</span></div>`).join('')}</div><div class="note"><b>Baixo</b> até 39: acompanhar. <b>Médio</b> de 40 a 69: preparar com 90 dias. <b>Alto</b> a partir de 70: preparar com 120 dias e cotar alternativa.</div></div>`)}
function movimentoModal(){const H=carteiraHealth(),fim=H.rec,ini=fim/1.091,novos=ini*.072,cross=ini*.038,reaj=ini*.052,perdas=ini+novos+cross+reaj-fim;
  const steps=[['12 meses atrás',ini,'total'],['Clientes novos',novos,'up'],['Cross-sell',cross,'up'],['Reajustes',reaj,'up'],['Perdas',-perdas,'down'],['Hoje',fim,'total']];
  const W=760,Hh=280,top=34,base=Hh-38,floor=Math.floor(ini*.8/1e4)*1e4,max=ini+novos+cross+reaj,sc=v=>v/(max-floor)*(base-top),lv=v=>base-sc(v-floor),bw=W/steps.length;let run=0;
  const bars=steps.map(([l,v,t],i)=>{let y0,h,col;if(t==='total'){y0=lv(v);h=base-y0;run=v;col='var(--text)';}else if(v>0){y0=lv(run+v);h=sc(v);run+=v;col='var(--green)';}else{y0=lv(run);h=sc(-v);run+=v;col='var(--red)';}
    const x=i*bw+bw*.2,w=bw*.6;return`<rect x="${x}" y="${y0}" width="${w}" height="${Math.max(2,h)}" rx="6" fill="${col}" opacity="${t==='total'?.85:.9}"/><text class="v" x="${x+w/2}" y="${y0-9}" text-anchor="middle">${t==='total'?'':v>0?'+':'−'}${compact(Math.abs(v))}</text><text x="${x+w/2}" y="${Hh-14}" text-anchor="middle">${l}</text>`+(i<steps.length-1?`<line x1="${x+w}" x2="${x+bw+bw*.2}" y1="${t==='total'||v>0?y0:y0+h}" y2="${t==='total'||v>0?y0:y0+h}" stroke="var(--line)" stroke-dasharray="3 3"/>`:'');}).join('');
  openModal(`${mHead('Movimento da receita em 12 meses',`De ${compact(ini)} para ${compact(fim)} em receita anual de comissões · +9,1%`)}
  <div class="m-body"><svg class="chart wf" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Ponte da receita em 12 meses"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--line)"/>${bars}</svg><p class="t3 xs" style="margin-top:-12px">O eixo começa em ${compact(floor)} para deixar as variações visíveis.</p>
  <div class="mini">
    <div class="r"><span>Clientes novos<br><span class="t3 sm">Receita de clientes que entraram nos últimos 12 meses</span></span><span class="up">+${brl(novos)}</span></div>
    <div class="r"><span>Cross-sell<br><span class="t3 sm">Produtos novos vendidos para quem já era cliente</span></span><span class="up">+${brl(cross)}</span></div>
    <div class="r"><span>Reajustes<br><span class="t3 sm">Variação de prêmio nas renovações mantidas</span></span><span class="up">+${brl(reaj)}</span></div>
    <div class="r"><span>Perdas<br><span class="t3 sm">Apólices não renovadas ou canceladas · retenção de 91,2%</span></span><span class="down">−${brl(perdas)}</span></div>
  </div><p class="t3 xs">Composição estimada com os dados de exemplo. Com as apólices reais, cada barra abre a lista de clientes que a formam.</p></div>`,{wide:true});}
function cadastroModal(editId){const inc=CLIENTS.filter(c=>!cadOk(c));
  const form=c=>`<div class="cadform">${c.missing.map((m,i)=>`<div class="field"><label for="cf${i}">${m}</label>${m==='Imóvel próprio'?`<select class="input" id="cf${i}"><option>Sim</option><option>Não</option></select>`:m==='Dependentes'?`<input class="input" id="cf${i}" type="number" min="0" value="0">`:/Data/.test(m)?`<input class="input" id="cf${i}" type="date">`:/E-mail/.test(m)?`<input class="input" id="cf${i}" type="email" placeholder="nome@empresa.com.br">`:`<input class="input" id="cf${i}">`}</div>`).join('')}<div class="acts2"><button class="btn quiet" data-act="cadastro">Cancelar</button><button class="btn solid" data-act="cadsave" data-id="${c.id}">Salvar</button></div></div>`;
  openModal(`${mHead('Completar cadastros',`${plural(inc.length,'cliente com dados faltando','clientes com dados faltando')}. O motor de ofertas usa esses campos para sugerir a próxima venda.`)}
  <div class="m-body">${inc.length?`<div class="list">${inc.map(c=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span class="txt"><span class="ttl">${esc(c.nome)}</span><span class="sub">Falta: ${c.missing.join(', ').toLowerCase()}</span></span>${editId===c.id?'':`<button class="btn" data-act="cadedit" data-id="${c.id}">Completar</button>`}</div>${editId===c.id?`<div style="margin-top:12px">${form(c)}</div>`:''}</div>`).join('')}</div>`:'<p class="empty">Todos os cadastros estão completos.</p>'}</div>`,{wide:true});}
function waBulkModal(){const cs=Object.keys(S.sel).map(byId).filter(Boolean);
  openModal(`${mHead('Mensagens de WhatsApp',`${plural(cs.length,'cliente selecionado','clientes selecionados')}. Cada mensagem já vem escrita para o momento do cliente.`)}
  <div class="m-body"><div class="list">${cs.map(c=>{const ctx=c.prox&&days(c.prox.fim)<=120?{p:c.prox}:(c.offers[0]&&c.offers[0].prop>=70?{o:c.offers[0]}:null);const m=waMsg(c,ctx);
    return`<div class="row"><span class="main">${txt(esc(c.nome),esc(m.slice(0,96))+'…')}</span><span class="end">${waBtn(c,ctx,true)}</span></div>`}).join('')}</div>
  <p class="t3 xs">O WhatsApp não permite envio em massa por link: abra uma conversa por vez. Cada envio registra o contato do cliente. Na demonstração, abre sem destinatário.</p></div>`,{wide:true});}
function exportRows(){return Object.keys(S.sel).map(byId).filter(Boolean).map(c=>({Cliente:c.nome,Tipo:c.tipo,Perfil:persona(c),Telefone:c.tel,'E-mail':c.email,Cidade:c.cidade,Produtos:c.apolices.length,'Receita anual (R$)':Math.round(c.receita),'Prêmio anual (R$)':Math.round(c.premio),'Próxima ação':nextAction(c).t,'Último contato (dias)':c.ultContato,'Apólices':c.apolices.map(p=>`${p.ramo} · ${p.ins} · vence ${fdateY(p.fim)}`).join(' | ')}));}
let xlsxP=null;const loadXLSX=()=>xlsxP||(xlsxP=new Promise((res,rej)=>{if(window.XLSX)return res(window.XLSX);const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';sc.onload=()=>res(window.XLSX);sc.onerror=rej;document.head.appendChild(sc);}));
async function exportSel(){const rows=exportRows();if(!rows.length)return;const name=`carteira-moltz-${TODAY.toISOString().slice(0,10)}`;
  const dl=window.claude?.use?await window.claude.use('downloads').catch(()=>null):null;
  if(!dl){toast('O download não está disponível nesta visualização');return;}
  let file,data;try{const X=await loadXLSX();const ws=X.utils.json_to_sheet(rows);ws['!cols']=Object.keys(rows[0]).map(k=>({wch:Math.min(48,Math.max(k.length,...rows.map(r=>String(r[k]).length))+2)}));const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Clientes');data=new Uint8Array(X.write(wb,{bookType:'xlsx',type:'array'}));file=name+'.xlsx';}
  catch(e){const cols=Object.keys(rows[0]),q=v=>`"${String(v).replace(/"/g,'""')}"`;data='﻿'+[cols.map(q).join(';'),...rows.map(r=>cols.map(c=>q(r[c])).join(';'))].join('\r\n');file=name+'.csv';}
  try{await dl.save({filename:file,data});toast(`${plural(rows.length,'cliente exportado','clientes exportados')}`);}catch(e){if(e.code!=='declined')toast('Não foi possível exportar agora');}}
function renderBulk(){const n=Object.keys(S.sel).length,b=$('#bulk');if(!b)return;
  b.classList.toggle('on',n>0&&S.view==='carteira');
  b.innerHTML=n?`<span class="n">${plural(n,'selecionado','selecionados')}</span>
  <button data-act="bexport"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg><span class="lbl">Exportar</span></button>
  <button data-act="bwa">${WA_SVG}<span class="lbl">WhatsApp</span></button>
  <button data-act="breview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 4h12v17l-6-4-6 4z"/></svg><span class="lbl">${Object.keys(S.sel).every(id=>S.review[id])?'Tirar da revisão':'Marcar revisão'}</span></button>
  <button class="x" data-act="bclear" aria-label="Limpar seleção">${ico('x')}</button>`:'';}
function filtersModal(){const sel=(id,lab,opts,cur)=>`<div class="field"><label for="${id}">${lab}</label><select class="input" id="${id}">${opts.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('')}</select></div>`;
  openModal(`${mHead('Filtrar clientes','')}<div class="m-body">${sel('fRamo','Tem produto do ramo',['Todos',...RAMOS],S.cRamo)}${sel('fIns','Tem apólice na seguradora',['Todas',...INS],S.cIns)}<div class="field"><label for="fProd">Número de produtos</label><select class="input" id="fProd"><option value="todos" ${S.cProd==='todos'?'selected':''}>Qualquer</option><option value="1" ${S.cProd==='1'?'selected':''}>1 produto</option><option value="2" ${S.cProd==='2'?'selected':''}>2 ou mais</option></select></div></div><div class="m-foot"><button class="btn quiet" data-act="cclear">Limpar</button><button class="btn solid" data-act="capply">Aplicar</button></div>`);}
function moreSheet(){const v=imp(),dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
  const G=[['oportunidades','Oportunidades','<path d="M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3z"/><path d="M9 21h6"/>'],['avisos','Avisos','<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>'],['assistente','Assistente','<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>'],['desempenho','Desempenho','<path d="M4 20V14M10 20V9M16 20V4M22 20H2"/>'],['treinamento','Treinamento','<path d="M3 6l9-3 9 3-9 3z"/><path d="M7 8v5c0 1.5 2.2 3 5 3s5-1.5 5-3V8"/>'],['eventos','Eventos','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>']];
  openModal(`${mHead('Mais','')}<div class="m-body">
    <div class="sheet-user"><span class="av">CE</span><span class="txt"><span class="ttl">${esc(SESSION.nome)}</span><span class="sub">${esc(SESSION.usuario)} · ${level(v).n} · ${v} pts</span></span></div>
    <div class="sheet-grid">${G.map(([k,l,d])=>`<a href="#${k}" data-go="${k}" class="${S.view===k?'on':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>${l}</a>`).join('')}</div>
    <div class="sec-h"><span class="t2">Aparência</span>${seg([['light','Claro'],['dark','Escuro']],dark?'dark':'light','settheme')}</div>
  </div><div class="m-foot"><button class="btn quiet" data-act="logout">Sair</button></div>`);$('#modal').dataset.kind='sheet';}
function pillarModal(i){const p=pillars()[i];openModal(`${mHead(p.k,`Peso de ${p.w}% no índice · ${p.pts} de ${p.w*10} pontos`)}
  <div class="m-body"><dl class="dl"><div><dt>Atual</dt><b>${p.cur}</b></div><div><dt>Meta</dt><b>${p.meta}</b></div></dl><div class="pbar"><i style="width:${Math.round(p.ratio*100)}%"></i></div>
  <div class="note"><b>Como medimos.</b> ${p.d}</div><div class="note"><b>Como subir.</b> ${p.tip}</div></div>`);}

/* ===================== Claude ===================== */
let samplePromise=null,sampleOff=false;
const getSample=()=>samplePromise||(samplePromise=(window.claude?.use?window.claude.use('sample').catch(()=>null):Promise.resolve(null)));
const OFF=['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'];
async function genScript(id){clientModal(id,'roteiro');const out=$('#scriptOut'),c=byId(id),o=c.offers[0],p=c.prox||c.apolices[0];
  const fb=`Abertura\n"${c.tipo==='PF'?c.nome.split(' ')[0]:c.resp.split(' ')[0]}, aqui é da sua corretora. Estou revisando seu ${p.ramo.toLowerCase()} com a ${p.ins}, que vence em ${fdate(p.fim)}, e quero antecipar a renovação para não termos surpresa no valor."\n\nDiagnóstico\nO que mudou no último ano? Família, veículo, empresa, uso do seguro.\n\n${o?`Oferta\n${o.rule.why} Proponha ${o.rule.prod.toLowerCase()} com uma cotação comparativa.\n\n`:''}Próximo passo\nAgende 20 minutos nesta semana para apresentar a proposta.`;
  const sample=sampleOff?null:await getSample();if(!sample){out.textContent=fb;out.classList.remove('t2');return;}
  out.textContent='Escrevendo o roteiro…';
  const prompt=`Você é coach comercial de corretores de seguros no Brasil. Escreva em português um roteiro curto de ligação (até 160 palavras) com quatro blocos titulados: Abertura, Diagnóstico (2 perguntas), Oferta, Próximo passo. Tom consultivo, sem pressão, sem prometer preço. Texto simples, sem markdown.\n\nCliente: ${persona(c)}. Apólices: ${c.apolices.map(a=>`${a.ramo} na ${a.ins}, vence em ${days(a.fim)} dias, reajuste previsto ${a.reajPrev.toFixed(0)}%`).join('; ')}.\nOferta sugerida: ${o?`${o.rule.prod} (motivo: ${o.rule.why})`:'nenhuma; foque na renovação'}.`;
  try{await sample(prompt,{modelTier:'quick',onText:({text})=>{out.textContent=text;out.classList.remove('t2')}});}catch(e){if(OFF.includes(e.code))sampleOff=true;out.textContent=fb;}}
async function sendChat(q){q=q.trim();if(!q)return;S.chat.push({role:'user',content:q});const last={role:'assistant',content:'Consultando sua carteira…',pending:true,srcs:[]};S.chat.push(last);render();
  const fin=()=>{delete last.pending;render();};
  const local=()=>{const r=localAnswer(q);last.content=r.t;last.srcs=r.srcs;if(r.cli)last.cli=r.cli;fin();};
  const sample=sampleOff?null:await getSample();
  let canTools=false;if(sample){try{const lim=await sample.limits();canTools=!!lim.tools;}catch(e){}}
  if(!sample||!canTools){setTimeout(local,350);return;}
  const used=new Set();
  const tools=TOOLDEFS.map(d=>({name:d.name,description:d.description,inputSchema:d.inputSchema,execute:(input)=>{const r=d.run(input||{});used.add(d.src(r));last.srcs=[...used];return r;}}));
  const RULES_TXT=`Você é o assistente da Møltz para a corretora "${SESSION.nome}". Hoje é ${TODAY.toLocaleDateString('pt-BR')}.
Regras obrigatórias:
1. Responda SOMENTE com informações retornadas pelas ferramentas nesta conversa. Não use conhecimento próprio, não pesquise fora e não complete lacunas com suposições.
2. Se as ferramentas não trouxerem a resposta, diga que a informação não está na carteira nem na base de seguradoras.
3. As ferramentas já retornam apenas dados desta corretora. Nunca mencione, compare ou especule sobre outras corretoras.
4. Se a base disser que o manual de uma seguradora não foi carregado, diga isso e use apenas o trecho de regulação retornado.
5. Português, texto simples sem markdown, até 120 palavras. Valores em reais.`;
  const turns=[{role:'user',content:RULES_TXT},...S.chat.filter(m=>!m.pending).slice(-8).map(m=>({role:m.role,content:m.content}))];
  try{await sample(turns,{modelTier:'quick',tools,onText:({text})=>{last.content=text;const el=$('#msgs');const b=el&&el.lastElementChild&&el.lastElementChild.querySelector('.body');if(b)b.textContent=text;}});
    const c=findClient(q);if(c)last.cli=c.id;fin();}
  catch(e){if(OFF.includes(e.code)||e.code==='tools_unavailable')sampleOff=true;if(e.text){last.content=e.text;fin();}else local();}
}

/* ===================== ⌘K ===================== */
let cmdSel=0;
function openCmd(){const c=$('#cmd');c.hidden=false;$('#scrim').classList.add('on');c.innerHTML=`<input id="cmdIn" placeholder="Buscar cliente, telefone, apólice ou tela" autocomplete="off" aria-label="Buscar"><div class="res" id="cmdRes"></div>`;cmdRender('');$('#cmdIn').focus();}
function closeCmd(){$('#cmd').hidden=true;if(!$('#modal').classList.contains('on'))$('#scrim').classList.remove('on');}
function cmdRender(q){q=q.toLowerCase().trim();const pages=[...NAV,['assistente','Assistente'],...MORE].filter(([k,l])=>!q||l.toLowerCase().includes(q));
  const cls=q.length<2?[]:CLIENTS.filter(c=>c.nome.toLowerCase().includes(q)||c.tel.includes(q)||c.apolices.some(p=>p.id.toLowerCase().includes(q))).slice(0,7);
  const items=[...cls.map(c=>({a:'cli',id:c.id,l:esc(c.nome),r:c.tel})),...pages.map(([k,l])=>({a:'go',v:k,l,r:'Ir para'}))];cmdSel=Math.min(cmdSel,Math.max(0,items.length-1));
  $('#cmdRes').innerHTML=(cls.length?'<div class="h">Clientes</div>':'')+items.map((x,i)=>(i===cls.length?'<div class="h">Telas</div>':'')+`<button class="${i===cmdSel?'sel':''}" data-act="${x.a}" data-id="${x.id||''}" data-v="${x.v||''}"><span>${x.l}</span><span class="t3 sm">${x.r}</span></button>`).join('')||'<p class="empty">Nada encontrado.</p>';}

/* ===================== RENDER ===================== */
function renderChrome(){const v=imp();
  $('#nav').innerHTML=NAV.map(([k,l])=>`<a href="#${k}" data-go="${k}" class="${S.view===k?'on':''}">${l}</a>`).join('')+`<span class="sep"></span><a href="#assistente" data-go="assistente" class="ai ${S.view==='assistente'?'on':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path class="s1" d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path class="s2" d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg><span>Assistente</span></a>`;
  $('#aiMobile').classList.toggle('on',S.view==='assistente');
  $('#meBtn').innerHTML=`<span class="lvl">${level(v).n} · <span class="imp">${v}</span></span><span class="av">CE</span>`;
  const extra='';
  $('#menu').innerHTML=extra+MORE.map(([k,l])=>`<a href="#${k}" data-go="${k}">${l}</a>`).join('')+`<hr><button data-act="theme">Modo claro / escuro</button><button data-act="logout">Sair</button>`;
  $('#bell').querySelector('.n')?.remove();if(POLICIES.some(p=>days(p.fim)<0&&p.status!=='Renovada'))$('#bell').insertAdjacentHTML('beforeend','<span class="n"></span>');
  const tb=[['inicio','Início'],['carteira','Carteira'],['renovacoes','Renovar']];
  $('#tabbar').innerHTML=tb.map(([k,l])=>`<a href="#${k}" data-go="${k}" class="${S.view===k?'on':''}">${ico(k)}${l}</a>`).join('')+`<button data-act="menu" class="${!tb.some(t=>t[0]===S.view)?'on':''}">${ico('mais')}Mais</button>`;
}
function render(){renderChrome();$('#page').innerHTML=V[S.view]();renderBulk();}
function go(v){if(!V[v])v='inicio';S.view=v;closePop();$('#menu').hidden=true;try{history.replaceState(null,'','#'+v)}catch(e){}render();if(v==='carteira')loadCustomers();if(v==='renovacoes')loadRenewalPolicies();window.scrollTo({top:0});}
let tt;function toast(h){const t=$('#toast');t.innerHTML=h;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600);}
function bump(k,msg){const b=imp();S.acts[k]++;saveActs();renderChrome();const d=imp()-b;toast(`${msg}${d>0?` · <b>+${d} no índice</b>`:''}`);}

/* ===================== EVENTOS ===================== */
document.addEventListener('click',e=>{
  if(S.popG&&!e.target.closest('#pop')&&!e.target.closest('.fpill'))closePop();
  if(!e.target.closest('.more')&&!e.target.closest('#tabbar'))$('#menu').hidden=true;
  const g=e.target.closest('[data-go]');if(g){e.preventDefault();closeModal();closeCmd();if(g.dataset.go==='renovacoes')S.renMode='todas';go(g.dataset.go);return;}
  const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,v=el.dataset.v;
  switch(a){
    case 'customer-details':if(!e.target.closest('a')){el.focus();customerModal(el.dataset.id);}break;
    case 'customer-tab':customerModal(el.dataset.id,v);break;
    case 'wa':{e.stopPropagation();const c=byId(el.dataset.id);if(c.ultContato>90)S.acts.contatos++;c.ultContato=0;saveActs();renderChrome();return;}
    case 'cli':closeCmd();clientModal(el.dataset.id,el.dataset.tab||'resumo');break;
    case 'go':closeCmd();closeModal();if(v==='renovacoes')S.renMode='todas';go(v);break;
    case 'close':closeModal();if(S.view==='renovacoes')render();break;
    case 'mtab':clientModal(el.dataset.id,v);break;
    case 'pol':policyModal(el.dataset.id);break;
    case 'api-policy':apiPolicyModal(el.dataset.id);break;
    case 'policies-retry':loadRenewalPolicies();break;
    case 'rule':ruleModal(v);break;
    case 'extrato':extratoModal(v);break;
    case 'div':divModal(el.dataset.id,el.dataset.m);break;
    case 'contest':S.done[el.dataset.k]=1;store.set('done',S.done);closeModal();render();toast('Contestação registrada');break;
    case 'sim':simModal();break;
    case 'pool':poolModal(v);break;
    case 'sources':sourcesModal();break;
    case 'howrisk':riskModal();break;
    case 'pillar':pillarModal(+el.dataset.i);break;
    case 'semcontato':semContatoModal();break;
    case 'gosaude':S.renMode='saude';go('renovacoes');break;
    case 'ctog':e.stopPropagation();if(S.cOpen[el.dataset.id])delete S.cOpen[el.dataset.id];else S.cOpen[el.dataset.id]=1;render();break;
    case 'cexpand':if(Object.keys(S.cOpen).length)S.cOpen={};else CLIENTS.filter(c=>c.apolices.length>1).forEach(c=>S.cOpen[c.id]=1);render();break;
    case 'csort':if(S.cSort===v)S.cDir*=-1;else{S.cSort=v;S.cDir=(v==='nome'||v==='prox')?1:-1;}S.cPage=1;render();break;
    case 'cpage':loadCustomers(+v);break;
    case 'customers-retry':loadCustomers(customerPage.page);break;
    case 'renpage':S.renPage=+v;render();loadRenewalPolicies();break;
    case 'ren':S.ren=v;S.renPage=1;render();loadRenewalPolicies();break;
    case 'cprod':S.cProd=v;S.cPage=1;render();break;
    case 'fset':S.cf=emptyCF();S.cf[el.dataset.g]=[v];S.cPage=1;closePop();render();break;
    case 'fpop':e.stopPropagation();if(S.popG===el.dataset.g)closePop();else openPop(el.dataset.g);break;
    case 'fchk':{e.stopPropagation();const g=el.dataset.g,a=S.cf[g];if(el.checked){if(!a.includes(v))a.push(v);}else S.cf[g]=a.filter(x=>x!==v);S.cPage=1;render();openPop(g);return;}
    case 'fclr':e.stopPropagation();S.cf[el.dataset.g]=[];S.cPage=1;render();openPop(el.dataset.g);return;
    case 'fmore':closePop();moreFiltersModal();break;
    case 'ftog':{const g=el.dataset.g,a=S.cf[g];S.cf[g]=a.includes(v)?a.filter(x=>x!==v):[...a,v];S.cPage=1;render();moreFiltersModal();break;}
    case 'fmoreclr':FILTERS.filter(f=>!f.main).forEach(f=>S.cf[f.g]=[]);S.cPage=1;render();moreFiltersModal();break;
    case 'cols':closePop();colsModal();break;
    case 'colchk':{e.stopPropagation();S.cols=COLS.filter(c=>c.k===v?el.checked:S.cols.includes(c.k)).map(c=>c.k);store.set('cols',S.cols);render();return;}
    case 'colreset':S.cols=['produtos','acao','venc','contato'];store.set('cols',S.cols);render();colsModal();break;
    case 'movimento':movimentoModal();break;
    case 'cadastro':cadastroModal();break;
    case 'cadedit':cadastroModal(el.dataset.id);break;
    case 'cadsave':{S.cad[el.dataset.id]=1;store.set('cad',S.cad);cadastroModal();render();toast('Cadastro completo · o motor de ofertas usa os novos dados');break;}
    case 'sel':{e.stopPropagation();const id=el.dataset.id;if(el.checked)S.sel[id]=1;else delete S.sel[id];render();return;}
    case 'selpage':{e.stopPropagation();const on=el.checked;(S._page||[]).forEach(id=>{if(on)S.sel[id]=1;else delete S.sel[id];});render();return;}
    case 'bclear':S.sel={};render();break;
    case 'bexport':exportSel();break;
    case 'bwa':waBulkModal();break;
    case 'breview':{const ids=Object.keys(S.sel),all=ids.every(id=>S.review[id]);ids.forEach(id=>{if(all)delete S.review[id];else S.review[id]=1;});store.set('review',S.review);if(!all){S.sel={};}render();toast(all?'Removidos da revisão':`${plural(ids.length,'cliente marcado','clientes marcados')} para revisão · visão "Em revisão" disponível`);break;}
    case 'cfilters':filtersModal();break;
    case 'capply':S.cRamo=$('#fRamo').value;S.cIns=$('#fIns').value;S.cProd=$('#fProd').value;S.cPage=1;closeModal();render();break;
    case 'cclear':S.cf=emptyCF();S.cq='';S.cPage=1;closePop();closeModal();render();break;
    case 'destab':S.desTab=v;render();break;
    case 'goren':S.renMode='todas';S.ren='venc';go('renovacoes');break;
    case 'gocaro':S.renMode='todas';S.ren='120';go('renovacoes');break;
    case 'tins':S.trainIns=v;render();break;
    case 'renew':{const p=POLICIES.find(x=>x.id===el.dataset.id);p.status='Renovada';closeModal();render();bump('salvas','Renovação concluída');break;}
    case 'contact':{const c=byId(el.dataset.id);c.ultContato=0;bump('contatos','Contato registrado');break;}
    case 'script':genScript(el.dataset.id);break;
    case 'course':{const c=COURSES[+el.dataset.i];if(c.d<c.a){c.d++;render();if(c.d===c.a)bump('trilhas','Trilha concluída');else toast(`Aula ${c.d} de ${c.a} concluída`);}break;}
    case 'dl':toast('Material de exemplo. O download chega com a conexão ao portal da seguradora.');break;
    case 'ev':S.events[el.dataset.i]=1;store.set('events',S.events);render();renderChrome();toast('Inscrição confirmada');break;
    case 'unev':delete S.events[el.dataset.i];store.set('events',S.events);render();toast('Inscrição cancelada');break;
    case 'ask':sendChat(el.dataset.q);break;
    case 'privacy':privacyModal();break;
    case 'settheme':document.documentElement.dataset.theme=v;store.set('theme',v);moreSheet();break;
    case 'cmd':openCmd();break;
    case 'menu':{e.stopPropagation();if(innerWidth<=720){moreSheet();break;}const m=$('#menu');m.hidden=!m.hidden;break;}
    case 'theme':{const r=document.documentElement,dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=dark?'light':'dark';store.set('theme',r.dataset.theme);$('#menu').hidden=true;if($('#modal').classList.contains('on')&&$('#modal').dataset.kind==='sheet')moreSheet();break;}
    case 'logout':signOut();location.reload();break;
    case 'logout':redirectToLogin();break;
  }
});
document.addEventListener('input',e=>{const t=e.target;
  if(t.id==='cmdIn'){cmdSel=0;cmdRender(t.value);}
  if(t.id==='slMeta'){S.meta=+t.value;$('#vMeta').textContent=S.meta+'%';}
  if(t.id==='slVcmh'){S.vcmh=+t.value;$('#vVcmh').textContent=S.vcmh+'%';}
  if(t.id==='cq'){S.cq=t.value;S.cPage=1;const pos=t.selectionStart;render();const n=$('#cq');n.focus();n.setSelectionRange(pos,pos);}
});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='cRamo'){S.cRamo=t.value;S.cPage=1;render();}if(t.id==='cIns'){S.cIns=t.value;S.cPage=1;render();}if(t.id==='cProd'){S.cProd=t.value;S.cPage=1;render();}});
document.addEventListener('submit',e=>{if(e.target.id==='chatForm'){e.preventDefault();const t=$('#chatIn'),q=t.value;t.value='';sendChat(q);}});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-act="customer-details"]')){e.preventDefault();e.target.click();return;}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!$('#app').hidden){e.preventDefault();$('#cmd').hidden?openCmd():closeCmd();return;}
  if(e.key==='Escape'&&S.popG){closePop();return;}
  if(e.key==='Escape'){if(!$('#cmd').hidden)closeCmd();else{closeModal();if(S.view==='renovacoes')render();}$('#menu').hidden=true;}
  if(e.target.id==='cmdIn'){const bs=[...$('#cmdRes').querySelectorAll('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();cmdSel=(cmdSel+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length;bs.forEach((b,i)=>b.classList.toggle('sel',i===cmdSel));}if(e.key==='Enter'&&bs[cmdSel])bs[cmdSel].click();}
  if(e.target.id==='chatIn'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#chatForm').requestSubmit();}
});
$('#scrim').addEventListener('click',()=>{closeCmd();closeModal();if(S.view==='renovacoes')render();});
(()=>{const t=store.get('theme',null);if(t)document.documentElement.dataset.theme=t;})();

/* radar do login */
(function(){const cv=$('#radarCanvas');if(!cv)return;const ctx=cv.getContext('2d');let w,h,t0=performance.now(),raf;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const pts=Array.from({length:26},(_,i)=>{const r=rng(77+i);return{a:r()*Math.PI*2,d:.18+r()*.78}});
  function size(){const b=cv.getBoundingClientRect(),dpr=devicePixelRatio||1;w=b.width;h=b.height;cv.width=w*dpr;cv.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  function frame(now){if($('#login').hidden){cancelAnimationFrame(raf);return;}
    const cx=w*.78,cy=h*.8,Rr=Math.max(w,h)*.62,ang=reduce?1.2:((now-t0)/4200)%1*Math.PI*2;ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(124,227,172,.12)';ctx.lineWidth=1;for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,Rr*i/4,0,Math.PI*2);ctx.stroke();}
    if(ctx.createConicGradient){const g=ctx.createConicGradient(ang-0.9,cx,cy);g.addColorStop(0,'rgba(60,203,127,0)');g.addColorStop(.14,'rgba(60,203,127,.2)');g.addColorStop(.1401,'rgba(60,203,127,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,Rr,0,Math.PI*2);ctx.fill();}
    pts.forEach(p=>{const diff=((ang-p.a)%(Math.PI*2)+Math.PI*2)%(Math.PI*2),glow=Math.max(0,1-diff/2.2),x=cx+Math.cos(p.a)*Rr*p.d,y=cy+Math.sin(p.a)*Rr*p.d;ctx.fillStyle=`rgba(127,227,172,${.15+glow*.85})`;ctx.beginPath();ctx.arc(x,y,2+glow*2.5,0,Math.PI*2);ctx.fill();});
    if(!reduce)raf=requestAnimationFrame(frame);}
  size();addEventListener('resize',size);addEventListener('scroll',()=>{if(S.popG)openPop(S.popG)},{passive:true});raf=requestAnimationFrame(frame);})();

/* login → boas-vindas → app */
function enterApp(user,showWelcome=false){
  SESSION.usuario=user.email;
  $('#login').hidden=true;$('#app').hidden=false;
  go(showWelcome?'inicio':location.hash.slice(1));
  if(showWelcome){
    const w=$('#welcome');w.hidden=false;const rd=matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(()=>w.classList.add('fade'),rd?300:1500);setTimeout(()=>{w.hidden=true;w.className='';},rd?700:2150);
  }
  getSample();
}
addEventListener('auth:expired',()=>location.reload());
function redirectToLogin(){
  signOut();
  try{history.replaceState(null,'','#login');}catch(error){}
  location.reload();
}
addEventListener('auth:expired',redirectToLogin);
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector('button[type="submit"]'),error=$('#loginError');
  if(button.disabled)return;
  error.hidden=true;
  if(!form.reportValidity())return;
  button.disabled=true;button.textContent='Entrando...';form.setAttribute('aria-busy','true');
  let user;
  try{
    user=await signIn($('#lgEmail').value.trim(),$('#lgPass').value);
    $('#lgPass').value='';
  }catch(err){
    error.textContent=err.message;error.hidden=false;
    return;
  }finally{
    button.disabled=false;button.textContent='Continuar';form.removeAttribute('aria-busy');
  }
  enterApp(user,true);
});
(async()=>{
  const form=$('#loginForm'),button=form.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='Verificando sessão...';form.setAttribute('aria-busy','true');
  try{
    const user=await restoreSession();
    if(user)enterApp(user);
    else try{history.replaceState(null,'','#login');}catch(error){}
  }catch(error){
    $('#loginError').textContent=error.message;$('#loginError').hidden=false;
  }finally{
    button.disabled=false;button.textContent='Continuar';form.removeAttribute('aria-busy');
  }
})();
