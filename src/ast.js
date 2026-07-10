/**
 * Zolto AST Node Factory — Phase 3
 * Phase 1 : core Markdown blocks + inlines
 * Phase 2 : callouts · admonitions · reference links · figures ·
 *            definition lists · code metadata · extended inlines
 * Phase 3 : native block directives — embed · collapse · tabs · cards ·
 *            steps · columns · badge · tag · alert · timeline ·
 *            progress · avatar · icon
 */

// ═══ SHARED TYPE SETS ════════════════════════════════════════════════════════
export const CALLOUT_TYPES = new Set([
  'note','tip','warning','important','caution','danger',
  'info','success','check','bug','example','question',
  'abstract','todo','failure','seealso','summary','hint',
]);
export const ADMONITION_TYPES = new Set([
  ...CALLOUT_TYPES,'definition','theorem','proof','quote',
]);
export const PHASE3_NODE_TYPES = new Set([
  'embed','collapse','tabs','tab','card','card_group',
  'steps','step','columns','column','badge','tag',
  'alert','timeline','timeline_event','progress','avatar','icon',
]);

// ═══ BLOCK NODES — Phase 1 ═══════════════════════════════════════════════════
export function document(children=[],metadata={}){return{type:'document',children,metadata};}
export function heading(level,children=[],opts={}){return{type:'heading',level,id:opts.id??null,classes:opts.classes??[],children};}
export function paragraph(children=[]){return{type:'paragraph',children};}
export function horizontalRule(){return{type:'horizontal_rule'};}
export function blockquote(children=[]){return{type:'blockquote',children};}
export function list(ordered,items=[],opts={}){return{type:'list',ordered:!!ordered,start:opts.start??null,tight:opts.tight??true,children:items};}
export function listItem(children=[],opts={}){return{type:'list_item',checked:opts.checked??null,children};}
export function codeBlock(value='',opts={}){return{type:'code_block',lang:opts.lang??null,meta:opts.meta??null,value,title:opts.title??null,highlightLines:opts.highlightLines??[],lineNumbers:opts.lineNumbers??false,diff:opts.diff??false};}
export function table(head=[],rows=[],align=[],opts={}){return{type:'table',align,head,rows,caption:opts.caption??null};}
export function tableRow(cells=[]){return{type:'table_row',cells};}
export function tableCell(children=[],align=null){return{type:'table_cell',align,children};}
export function frontmatter(value='',data={}){return{type:'frontmatter',value,data};}
export function comment(value=''){return{type:'comment',value};}
export function importNode(path=''){return{type:'import',path};}
export function variableDef(name='',value=''){return{type:'variable_def',name,value};}
export function footnoteDef(id='',children=[]){return{type:'footnote_def',id,children};}
export function htmlBlock(value=''){return{type:'html_block',value};}

// ═══ BLOCK NODES — Phase 2 ═══════════════════════════════════════════════════
export function callout(calloutType='note',children=[],opts={}){return{type:'callout',calloutType:calloutType.toLowerCase(),title:opts.title??null,children};}
export function admonition(admonType='info',children=[],opts={}){return{type:'admonition',admonType:admonType.toLowerCase(),title:opts.title??null,children};}
export function referenceDef(id='',href='',title=null){return{type:'reference_def',id:id.toLowerCase(),href,title};}
export function figure(src='',alt='',opts={}){return{type:'figure',src,alt,title:opts.title??null,caption:opts.caption??null,lazy:opts.lazy??true,width:opts.width??null,height:opts.height??null};}
export function definitionList(items=[]){return{type:'definition_list',items};}
export function definitionItem(term='',defs=[]){return{type:'definition_item',term,defs};}

// ═══ BLOCK NODES — Phase 3 ═══════════════════════════════════════════════════

/** @embed image|video|audio|youtube|vimeo|figma|codepen|codesandbox|iframe */
export function embed(embedType='image',opts={}){
  return{type:'embed',embedType,src:opts.src??null,title:opts.title??null,alt:opts.alt??null,caption:opts.caption??null,width:opts.width??null,height:opts.height??null,lazy:opts.lazy??true,content:opts.content??null};
}
/** @collapse title="…" open=false */
export function collapse(title='',children=[],opts={}){
  return{type:'collapse',title,open:opts.open??false,children};
}
/** @tabs active=0 — contains tab[] */
export function tabs(items=[],opts={}){
  return{type:'tabs',active:opts.active??0,tabs:items};
}
/** @tab label="…" icon=… */
export function tab(label='',children=[],opts={}){
  return{type:'tab',label,icon:opts.icon??null,children};
}
/** @card [variant] title=… icon=… description=… href=… img=… */
export function card(opts={}){
  return{type:'card',variant:opts.variant??'default',title:opts.title??null,icon:opts.icon??null,description:opts.description??null,href:opts.href??null,img:opts.img??null,children:opts.children??[]};
}
/** @card-group cols=3 — contains card[] */
export function cardGroup(children=[],opts={}){
  return{type:'card_group',cols:opts.cols??3,children};
}
/** @steps — contains step[] */
export function steps(children=[]){return{type:'steps',children};}
/** @step title="…" icon=… */
export function step(title='',children=[],opts={}){
  return{type:'step',title,icon:opts.icon??null,children};
}
/** @columns gap=… — contains column[] */
export function columns(children=[],opts={}){
  return{type:'columns',gap:opts.gap??null,children};
}
/** @column width=… */
export function column(children=[],opts={}){
  return{type:'column',width:opts.width??null,children};
}
/** @badge [variant] icon=… outline=false pill=false */
export function badge(value='',opts={}){
  return{type:'badge',variant:opts.variant??'neutral',icon:opts.icon??null,outline:opts.outline??false,pill:opts.pill??false,value};
}
/** @tag color=… icon=… href=… */
export function tag(value='',opts={}){
  return{type:'tag',color:opts.color??null,icon:opts.icon??null,href:opts.href??null,value};
}
/** @alert [type] title=… icon=… dismissible=false */
export function alert(alertType='info',children=[],opts={}){
  return{type:'alert',alertType,title:opts.title??null,icon:opts.icon??null,dismissible:opts.dismissible??false,children};
}
/** @timeline — contains event[] */
export function timeline(children=[]){return{type:'timeline',children};}
/** @event title=… date=… icon=… */
export function timelineEvent(title='',children=[],opts={}){
  return{type:'timeline_event',title,date:opts.date??null,icon:opts.icon??null,children};
}
/** @progress value=0 max=100 label=… color=primary showPercent=false */
export function progress(value=0,opts={}){
  return{type:'progress',value:Number(value)||0,max:opts.max??100,label:opts.label??null,color:opts.color??'primary',showPercent:opts.showPercent??false};
}
/** @avatar src=… initials=… icon=… status=… size=md alt=… */
export function avatar(opts={}){
  return{type:'avatar',src:opts.src??null,initials:opts.initials??null,icon:opts.icon??null,status:opts.status??null,size:opts.size??'md',alt:opts.alt??null};
}
/** @icon [name] size=24 color=… label=… */
export function icon(name='',opts={}){
  return{type:'icon',name,size:opts.size??null,color:opts.color??null,label:opts.label??null};
}

// ═══ INLINE NODES — Phase 1 ══════════════════════════════════════════════════
export function text(value=''){return{type:'text',value};}
export function bold(children=[]){return{type:'bold',children};}
export function italic(children=[]){return{type:'italic',children};}
export function inlineCode(value=''){return{type:'inline_code',value};}
export function strikethrough(children=[]){return{type:'strikethrough',children};}
export function link(href='',children=[],title=null){return{type:'link',href,title,children};}
export function image(src='',alt='',titleOrOpts=null){const isOpts=titleOrOpts!==null&&typeof titleOrOpts==='object';const title=isOpts?(titleOrOpts.title??null):titleOrOpts;const opts=isOpts?titleOrOpts:{};return{type:'image',src,alt,title,lazy:opts.lazy??true,width:opts.width??null,height:opts.height??null};}
export function linebreak(){return{type:'linebreak'};}
export function softbreak(){return{type:'softbreak'};}
export function variableRef(name=''){return{type:'variable_ref',name};}
export function footnoteRef(id='',index=0){return{type:'footnote_ref',id,index};}

// ═══ INLINE NODES — Phase 2 ══════════════════════════════════════════════════
export function superscript(children=[]){return{type:'superscript',children};}
export function subscript(children=[]){return{type:'subscript',children};}
export function highlight(children=[]){return{type:'highlight',children};}
export function kbd(value=''){return{type:'kbd',value};}
export function htmlEntity(raw=''){return{type:'html_entity',raw};}
export function refLink(id='',children=[]){return{type:'ref_link',id:id.toLowerCase(),children};}

export const INLINE_TYPES=new Set(['text','bold','italic','inline_code','strikethrough','link','image','linebreak','softbreak','variable_ref','footnote_ref','superscript','subscript','highlight','kbd','html_entity','ref_link']);
