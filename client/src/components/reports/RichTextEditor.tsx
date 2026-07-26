import { useRef, useState, useEffect, useCallback } from 'react';
import client from '../../api/client';

interface Props {
  editorId: string;
  initialValue?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
}

export default function RichTextEditor({ editorId, initialValue = '', placeholder = '输入内容...', onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (editorRef.current && initialValue) {
      editorRef.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  const refreshState = useCallback(() => {
    if (!editorRef.current) return;
    try {
      let insideHeading = false;
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let n: Node | null = sel.anchorNode;
        while (n && n !== editorRef.current) {
          if (n.nodeName === 'H3') { insideHeading = true; break; }
          n = n.parentNode;
        }
      }
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        heading: insideHeading,
      });
    } catch {}
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.addEventListener('keyup', refreshState);
    el.addEventListener('click', refreshState);
    document.addEventListener('selectionchange', refreshState);
    return () => {
      el.removeEventListener('keyup', refreshState);
      el.removeEventListener('click', refreshState);
      document.removeEventListener('selectionchange', refreshState);
    };
  }, [refreshState]);

  const exec = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value ?? '');
    refreshState();
    if (editorRef.current) onChange?.(editorRef.current.innerHTML);
  };

  const toggleHeading = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'H3') {
        const p = document.createElement('p');
        p.innerHTML = (node as HTMLElement).innerHTML;
        node.parentNode?.replaceChild(p, node);
        refreshState();
        if (editorRef.current) onChange?.(editorRef.current.innerHTML);
        return;
      }
      node = node.parentNode;
    }
    document.execCommand('formatBlock', false, '<h3>');
    refreshState();
  };

  const insertImageAtCursor = (url: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '0.5rem';
    img.style.margin = '0.5rem 0';
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    const br = document.createElement('br');
    img.after(br);
    refreshState();
    // Force sync content to parent state (onInput doesn't fire for programmatic insertions)
    if (editorRef.current) onChange?.(editorRef.current.innerHTML);
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await client.post('/upload', formData);
        insertImageAtCursor(res.data.url);
      } catch {
        alert('图片上传失败');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const btnClass = (name: string) => `rte-btn${active[name] ? ' active' : ''}`;

  return (
    <div className="rte-container">
      <div className="rte-toolbar">
        <button type="button" className={btnClass('bold')} onClick={() => exec('bold')} title="加粗"><b>B</b></button>
        <button type="button" className={btnClass('italic')} onClick={() => exec('italic')} title="斜体"><i>I</i></button>
        <button type="button" className={btnClass('underline')} onClick={() => exec('underline')} title="下划线"><u>U</u></button>
        <button type="button" className={btnClass('strikeThrough')} onClick={() => exec('strikeThrough')} title="删除线"><s>S</s></button>
        <span className="rte-sep" />
        <button type="button" className={btnClass('heading')} onClick={toggleHeading} title="标题">H</button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" onClick={handleImageUpload} disabled={uploading} title="插入图片">
          {uploading ? '...' : '🖼'}
        </button>
      </div>
      <div
        id={editorId}
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => { refreshState(); onChange?.((e.target as HTMLDivElement).innerHTML); }}
        onKeyUp={refreshState}
        onClick={refreshState}
      />
    </div>
  );
}
