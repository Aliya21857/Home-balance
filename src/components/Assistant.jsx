import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Leaf, LoaderCircle, Mic, MicOff, Pencil, Send, Sparkles, Trash2, X } from 'lucide-react';
import { createAssistantItems } from '../firebase/firestore';

const API_URL = 'https://home-balance-ai-assistant.aliyasha571983.workers.dev/api/assistant/parse';
const typeLabels = { task:'Дело', event:'Событие', project:'Проект', habit:'Привычка', idea:'Идея', note:'Заметка', reflection:'Размышление', goal:'Цель', resource:'Материал' };
const sectionLabels = { task:'Сегодня', event:'Календарь', project:'Проекты', habit:'Привычки', idea:'Идеи', note:'Заметки', reflection:'Размышления', goal:'Цели', resource:'Библиотека' };
const itemTypes = Object.keys(typeLabels);
const speechErrorMessages = {
  'not-allowed':'Доступ к микрофону запрещён. Разрешите его в настройках браузера или напишите сообщение вручную.',
  'service-not-allowed':'Служба распознавания речи заблокирована браузером. Проверьте настройки браузера или используйте текстовый ввод.',
  'no-speech':'Речь не обнаружена. Нажмите на микрофон и попробуйте сказать фразу ещё раз.',
  'audio-capture':'Не удалось получить звук с микрофона. Проверьте, подключён ли он и не используется ли другим приложением.',
  network:'Служба распознавания речи недоступна из-за сетевой ошибки. Проверьте интернет-соединение и попробуйте снова.',
  aborted:'Распознавание остановлено. Нажмите на микрофон, чтобы начать новую запись.',
};

const pad = value => String(value).padStart(2,'0');
const localContext = () => {
  const now = new Date();
  return {
    currentDate: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
    currentTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
};

function errorMessage(status, code) {
  if (status===401) return 'Сессия истекла. Войдите в аккаунт ещё раз.';
  if (status===403) return 'У этого аккаунта нет доступа к помощнику.';
  if (status===429) return 'Лимит AI-запросов достигнут. Попробуйте позже.';
  if (code==='INVALID_AI_RESPONSE') return 'Я не смогла уверенно разобрать эту фразу. Попробуйте сформулировать иначе.';
  if (status>=500) return 'Помощник временно недоступен. Попробуйте ещё раз.';
  return 'Не удалось связаться с помощником. Проверьте соединение и попробуйте ещё раз.';
}

function toFirestore(item) {
  const common = { title:item.title.trim(), sourceLanguage:item.sourceLanguage, aiConfidence:item.confidence };
  switch(item.type) {
    case 'task': return { collection:'tasks', payload:{ ...common, description:item.description||'', date:item.date||'', time:item.time||'', category:item.category||'', completed:false } };
    case 'event': return { collection:'events', payload:{ ...common, description:item.description||'', date:item.date||'', startTime:item.time||'', endTime:item.endTime||'', category:item.category||'' } };
    case 'project': return { collection:'projects', payload:{ ...common, description:item.description||'', deadline:item.date||'', status:'Активна', progress:0 } };
    case 'habit': return { collection:'habits', payload:{ ...common, category:item.category||'', frequency:item.frequency||'', active:true } };
    case 'idea': return { collection:'ideas', payload:{ ...common, text:item.description||'', category:item.category||'', pinned:'Нет' } };
    case 'note': return { collection:'notes', payload:{ ...common, text:item.description||'', category:item.category||'', pinned:'Нет' } };
    case 'reflection': return { collection:'reflections', payload:{ ...common, date:item.date||'', thoughts:item.description||item.title, mood:'', wins:'', gratitude:'', improvement:'' } };
    case 'goal': return { collection:'goals', payload:{ ...common, description:item.description||'', deadline:item.date||'', status:'Активна', progress:0 } };
    case 'resource': return { collection:'resources', payload:{ ...common, type:item.resourceType||'Материал', description:item.description||'', url:'', tags:item.category||'' } };
    default: throw new Error('Unsupported assistant item type');
  }
}

function PreviewItem({ item, index, onChange, onRemove }) {
  const [editing,setEditing]=useState(false);
  const change = (field,value) => onChange(index,{...item,[field]:value});
  return <article className={`assistant-preview-item${item.confidence<.65?' low-confidence':''}`}>
    <div className="assistant-preview-head"><span>{typeLabels[item.type]}</span><div><button type="button" onClick={()=>setEditing(value=>!value)} aria-label="Изменить запись"><Pencil/></button><button type="button" onClick={()=>onRemove(index)} aria-label="Не сохранять запись"><Trash2/></button></div></div>
    {editing?<div className="assistant-edit-grid">
      <label>Раздел<select value={item.type} onChange={event=>change('type',event.target.value)}>{itemTypes.map(type=><option value={type} key={type}>{typeLabels[type]}</option>)}</select></label>
      <label className="wide">Название<input value={item.title} onChange={event=>change('title',event.target.value)}/></label>
      <label className="wide">Текст<textarea value={item.description||''} onChange={event=>change('description',event.target.value||null)}/></label>
      <label>Дата<input type="date" value={item.date||''} onChange={event=>change('date',event.target.value||null)}/></label>
      <label>Время<input type="time" value={item.time||''} onChange={event=>change('time',event.target.value||null)}/></label>
      {item.type==='event'&&<label>Окончание<input type="time" value={item.endTime||''} onChange={event=>change('endTime',event.target.value||null)}/></label>}
      {item.type==='habit'&&<label>Повтор<input value={item.frequency||''} onChange={event=>change('frequency',event.target.value||null)}/></label>}
      {item.type==='resource'&&<label>Тип материала<input value={item.resourceType||''} onChange={event=>change('resourceType',event.target.value||null)}/></label>}
      <label>Категория<input value={item.category||''} onChange={event=>change('category',event.target.value||null)}/></label>
      <button className="assistant-edit-done" type="button" onClick={()=>setEditing(false)}><Check/> Готово</button>
    </div>:<div className="assistant-preview-copy"><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}<div>{item.date&&<span>{new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${item.date}T12:00:00`))}</span>}{item.time&&<span>{item.time}{item.endTime?`–${item.endTime}`:''}</span>}{item.category&&<span>{item.category}</span>}</div>{item.confidence<.65&&<small>Проверьте, правильно ли я определила раздел.</small>}</div>}
  </article>;
}

export default function Assistant({user}) {
  const [open,setOpen]=useState(false), [text,setText]=useState(''), [voiceLanguage,setVoiceLanguage]=useState('ru-RU');
  const [speechState,setSpeechState]=useState('ready'), [speechError,setSpeechError]=useState('');
  const [loading,setLoading]=useState(false), [items,setItems]=useState([]), [message,setMessage]=useState(''), [error,setError]=useState('');
  const [saving,setSaving]=useState(false), [saved,setSaved]=useState([]);
  const recognitionRef=useRef(null), stoppingRef=useRef(false), inputRef=useRef(null), triggerRef=useRef(null);
  const speechSupported=typeof globalThis!=='undefined'&&Boolean(globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition);

  useEffect(()=>{if(open)globalThis.setTimeout(()=>inputRef.current?.focus(),50);else recognitionRef.current?.abort?.()},[open]);
  useEffect(()=>{const escape=event=>{if(event.key==='Escape'&&open){setOpen(false);triggerRef.current?.focus()}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[open]);
  useEffect(()=>()=>recognitionRef.current?.abort?.(),[]);

  const close=()=>{setOpen(false);triggerRef.current?.focus()};
  const reset=()=>{setItems([]);setSaved([]);setMessage('');setError('');setText('')};
  const startListening=async()=>{
    setSpeechError('');
    if(!speechSupported){setSpeechError('Голосовой ввод недоступен в этом браузере. Вы можете написать сообщение вручную.');return}
    if(speechState==='listening'){stoppingRef.current=true;recognitionRef.current?.stop();return}
    const previous=recognitionRef.current;
    if(previous){previous.onstart=null;previous.onresult=null;previous.onerror=null;previous.onend=null;previous.abort?.();recognitionRef.current=null}
    setSpeechState('requesting');
    try{
      const getUserMedia=globalThis.navigator?.mediaDevices?.getUserMedia;
      if(getUserMedia){const stream=await getUserMedia.call(globalThis.navigator.mediaDevices,{audio:true});stream.getTracks().forEach(track=>track.stop())}
    }catch(permissionError){
      const permissionCode={NotAllowedError:'not-allowed',SecurityError:'service-not-allowed',NotFoundError:'audio-capture',NotReadableError:'audio-capture',AbortError:'aborted'}[permissionError?.name]||'audio-capture';
      setSpeechState('error');setSpeechError(speechErrorMessages[permissionCode]);return;
    }
    const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
    const recognition=new Recognition();
    recognition.lang=voiceLanguage;recognition.interimResults=true;recognition.continuous=false;
    let finalText='';stoppingRef.current=false;
    recognition.onstart=()=>{setSpeechError('');setSpeechState('listening')};
    recognition.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const part=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=part;else interim+=part}setText([finalText,interim].filter(Boolean).join(' '));setSpeechState(event.results[event.results.length-1].isFinal?'recognized':'listening')};
    recognition.onerror=event=>{const code=event.error||'unknown';setSpeechState(code==='aborted'&&stoppingRef.current?'stopped':'error');setSpeechError(speechErrorMessages[code]||`Не удалось распознать речь (${code}). Попробуйте ещё раз.`)};
    recognition.onend=()=>{recognitionRef.current=null;stoppingRef.current=false;setSpeechState(state=>state==='error'||state==='recognized'?state:'stopped')};
    recognitionRef.current=recognition;
    try{recognition.start()}catch{setSpeechState('error');setSpeechError('Не удалось включить микрофон. Попробуйте ещё раз.')}
  };
  const submit=async event=>{
    event.preventDefault();if(!text.trim()||loading)return;
    setLoading(true);setError('');setItems([]);setSaved([]);
    try{
      const token=await user.getIdToken();
      const response=await globalThis.fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({text:text.trim(),...localContext(),uiLanguage:voiceLanguage.startsWith('en')?'en':'ru'})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw Object.assign(new Error(body?.error?.message),{status:response.status,code:body?.error?.code});
      if(!Array.isArray(body.items)||!body.items.length)throw Object.assign(new Error('Invalid response'),{code:'INVALID_AI_RESPONSE'});
      setItems(body.items);setMessage(body.assistantMessage||'Проверьте записи перед сохранением.');
    }catch(requestError){setError(errorMessage(requestError.status||0,requestError.code))}finally{setLoading(false)}
  };
  const save=async()=>{
    const valid=items.filter(item=>item.title?.trim()&&itemTypes.includes(item.type));if(!valid.length||saving)return;
    setSaving(true);setError('');
    try{await createAssistantItems(user.uid,valid.map(toFirestore));setSaved(valid.map(item=>({title:item.title,section:sectionLabels[item.type]})));setItems([]);setMessage('')}catch{setError('Не удалось сохранить записи. Ничего не было добавлено — попробуйте ещё раз.')}finally{setSaving(false)}
  };
  const speechLabel={ready:'Готово к записи',requesting:'Запрашиваю доступ к микрофону…',listening:'Слушаю…',recognized:'Я услышала — текст можно изменить.',stopped:'Запись остановлена.',error:'Ошибка распознавания.'}[speechState];

  return <>
    <button ref={triggerRef} className="assistant-fab" type="button" onClick={()=>setOpen(true)} aria-label="Открыть AI Assistant" aria-expanded={open}><Sparkles/><span>Записать мысль</span></button>
    {open&&<><button className="assistant-scrim" type="button" onClick={close} aria-label="Закрыть помощника"/><aside className="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
      <header><button className="assistant-back" type="button" onClick={close} aria-label="Закрыть"><ChevronLeft/></button><div><span><Leaf/> AI ASSISTANT</span><h2 id="assistant-title">Алия, что запишем?</h2><p>Скажите или напишите — я помогу разложить всё по местам.</p></div><button className="assistant-close" type="button" onClick={close} aria-label="Закрыть"><X/></button></header>
      <div className="assistant-body">
        {saved.length?<section className="assistant-success"><Sparkles/><h3>Готово. Я добавила {saved.length} {saved.length===1?'запись':'записи'} в ваш Дом баланса.</h3>{saved.map((item,index)=><p key={`${item.title}-${index}`}><Check/> <b>{item.section}</b> — {item.title}</p>)}<button className="btn" type="button" onClick={reset}>Записать ещё</button></section>:<>
          {!items.length&&<form className="assistant-compose" onSubmit={submit}><label htmlFor="assistant-input">Ваша мысль</label><textarea ref={inputRef} id="assistant-input" value={text} onChange={event=>setText(event.target.value)} placeholder="Например: Завтра в 15:00 позвонить врачу и записать идею нового курса…" maxLength="5000" disabled={loading}/><div className="assistant-voice-row"><div className="voice-switch" aria-label="Язык голосового ввода"><span>Голос:</span><button type="button" className={voiceLanguage==='ru-RU'?'active':''} onClick={()=>setVoiceLanguage('ru-RU')}>RU</button><button type="button" className={voiceLanguage==='en-US'?'active':''} onClick={()=>setVoiceLanguage('en-US')}>EN</button></div><button type="button" className={`mic-button${speechState==='listening'?' listening':''}`} onClick={startListening} aria-label={speechState==='listening'?'Остановить голосовой ввод':'Начать голосовой ввод'} disabled={loading}>{speechState==='listening'?<MicOff/>:<Mic/>}</button></div><p className={`speech-status ${speechState}`}>{speechLabel}</p>{(!speechSupported||speechError)&&<p className="assistant-inline-error">{speechError||'Голосовой ввод недоступен в этом браузере. Вы можете написать сообщение вручную.'}</p>}<button className="assistant-submit" type="submit" disabled={!text.trim()||loading}>{loading?<><LoaderCircle className="spin"/> Разбираю мысль…</>:<><Send/> Разложить по местам</>}</button></form>}
          {items.length>0&&<section className="assistant-preview"><div className="assistant-message"><Sparkles/><p>{message}</p></div>{items.map((item,index)=><PreviewItem item={item} index={index} key={`${index}-${item.title}`} onChange={(i,next)=>setItems(current=>current.map((entry,j)=>j===i?next:entry))} onRemove={i=>setItems(current=>current.filter((_,j)=>j!==i))}/>) }{items.length?<div className="assistant-actions"><button className="btn ghost" type="button" onClick={reset}>Отмена</button><button className="btn" type="button" onClick={save} disabled={saving}>{saving?<><LoaderCircle className="spin"/> Сохраняю…</>:<>Записать всё <Check/></>}</button></div>:null}</section>}
          {error&&<div className="assistant-error" role="alert">{error}</div>}
        </>}
      </div>
    </aside></>}
  </>;
}
