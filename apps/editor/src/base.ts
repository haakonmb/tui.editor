import { Node as ProsemirrorNode, Schema } from 'prosemirror-model';
import { Plugin, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import css from 'tui-code-snippet/domUtil/css';
import { WidgetStyle, EditorType, EditorPos, Base } from '@t/editor';
import { Emitter } from '@t/event';
import { MdSourcepos } from '@t/markdown';
import { Context, EditorAllCommandMap } from '@t/spec';
import SpecManager from './spec/specManager';
import { createTextSelection } from './helper/manipulation';

export interface StateOptions {
  doc: ProsemirrorNode | null;
}

export default abstract class EditorBase implements Base {
  el: HTMLElement;

  editorType!: EditorType;

  eventEmitter: Emitter;

  context!: Context;

  schema!: Schema;

  keymaps!: Plugin[];

  view!: EditorView;

  commands!: EditorAllCommandMap;

  specs!: SpecManager;

  placeholder: { text: string };

  constructor(eventEmitter: Emitter) {
    this.el = document.createElement('div');
    this.el.className = 'te-editor';

    this.eventEmitter = eventEmitter;
    this.placeholder = { text: '' };
  }

  abstract createSpecs(): SpecManager;

  abstract createContext(): Context;

  abstract createState(state?: StateOptions): void;

  abstract createView(): EditorView;

  protected initEvent() {
    const { eventEmitter, view, editorType } = this;

    view.dom.addEventListener('focus', () => eventEmitter.emit('focus', editorType));
    view.dom.addEventListener('blur', () => eventEmitter.emit('blur', editorType));
  }

  protected emitChangeEvent(tr: Transaction) {
    this.eventEmitter.emit('caretChange', this.editorType);
    if (tr.docChanged) {
      this.eventEmitter.emit('change', this.editorType);
    }
  }

  createSchema() {
    return new Schema({
      nodes: this.specs.nodes,
      marks: this.specs.marks,
    });
  }

  createKeymaps(useCommandShortcut: boolean) {
    return useCommandShortcut ? this.specs.keymaps() : [];
  }

  createCommands() {
    return this.specs.commands(this.view);
  }

  focus() {
    this.view.focus();
    this.eventEmitter.emit('focus', this.editorType);
  }

  blur() {
    (this.view.dom as HTMLElement).blur();
    this.eventEmitter.emit('blur', this.editorType);
  }

  destroy() {
    this.view.destroy();
    Object.keys(this).forEach((prop) => {
      delete this[prop as keyof this];
    });
  }

  moveCursorToStart() {
    const { tr } = this.view.state;

    this.view.dispatch(tr.setSelection(createTextSelection(tr, 1)).scrollIntoView());
    this.focus();
  }

  moveCursorToEnd() {
    const { tr } = this.view.state;

    this.view.dispatch(
      tr.setSelection(createTextSelection(tr, tr.doc.content.size - 1)).scrollIntoView()
    );
    this.focus();
  }

  setScrollTop(top: number) {
    this.el.scrollTop = top;
  }

  getScrollTop() {
    return this.el.scrollTop;
  }

  setPlaceholder(text: string) {
    this.placeholder.text = text;
    this.view.dispatch(this.view.state.tr.scrollIntoView());
  }

  setHeight(height: number) {
    css(this.el, { height: `${height}px` });
  }

  setMinHeight(minHeight: number) {
    css(this.el, { minHeight: `${minHeight}px` });
  }

  getElement() {
    return this.el;
  }

  abstract replaceWithWidget(start: EditorPos, end: EditorPos, content: string): void;

  abstract addWidget(node: Node, style: WidgetStyle, pos?: EditorPos): void;

  abstract setSelection(start?: EditorPos, end?: EditorPos): void;

  abstract replaceSelection(content: string, start?: EditorPos, end?: EditorPos): void;

  abstract deleteSelection(start?: EditorPos, end?: EditorPos): void;

  abstract getSelectedContent(start?: EditorPos, end?: EditorPos): string;

  abstract getSelection(): MdSourcepos | [number, number];
}
