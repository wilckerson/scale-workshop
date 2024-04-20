type NoteOff = () => void
export type NoteOnCallback = (index: number) => NoteOff

const MOUSE_PRIMARY_BTN = 1
export class NoteInputHandler {
  private noteOffs: Map<number, NoteOff> = new Map()
  private noteOn: NoteOnCallback

  constructor(noteOn: NoteOnCallback) {
    this.noteOn = noteOn
  }

  private start(index: number) {
    const noteOff = this.noteOn(index)
    this.noteOffs.set(index, noteOff)
  }

  private end(index: number) {
    if (this.noteOffs.has(index)) {
      const noteOff = this.noteOffs.get(index)!
      noteOff()
      this.noteOffs.delete(index)
    }
  }

//   public onPointerDown(event: PointerEvent, index: number) {
//     //console.log("down",index, event)
//     //if (event.target instanceof Element && event.target.hasPointerCapture(event.pointerId)) {
//     // if (event.target && (event.target as any).hasPointerCapture(event.pointerId)) {
//     //     (event.target as any).releasePointerCapture(event.pointerId);
//     // }
//     console.log("released", event.pointerId);
//     (event.target as any).releasePointerCapture(event.pointerId);
//     //if (event.buttons !== MOUSE_PRIMARY_BTN) return
//     //event.preventDefault()
//     //this.start(index)
//   }

//   public onPointerUp(event: PointerEvent, index: number) {
//     // console.log("up",index,event)
//     // event.preventDefault()
//     // this.end(index)
//   }

//   public onPointerMove(event: PointerEvent, index: number) {
//      console.log("move",index,event)
//     // event.preventDefault()
//     // this.end(index)
//   }

//   public onPointerEnter(event: PointerEvent, index: number) {
//     // console.log("enter",index,event)
//     // if (event.buttons !== MOUSE_PRIMARY_BTN) return
//     // event.preventDefault()
//     // this.start(index)
//   }

//   public onPointerLeave(event: PointerEvent, index: number) {
//     console.log("leave",index,event)
//     //if (event.buttons !== MOUSE_PRIMARY_BTN) return
//     event.preventDefault()
//     this.end(index)
//   }

  public onMouseDown(event: MouseEvent, index: number) {
    if (event.buttons !== MOUSE_PRIMARY_BTN) return
    event.preventDefault()
    this.start(index)
  }

  public onMouseUp(event: MouseEvent, index: number) {
    event.preventDefault()
    this.end(index)
  }

  public onMouseEnter(event: MouseEvent, index: number) {
    if (event.buttons !== MOUSE_PRIMARY_BTN) return
    event.preventDefault()
    this.start(index)
  }

  public onMouseLeave(event: MouseEvent, index: number) {
    if (event.buttons !== MOUSE_PRIMARY_BTN) return
    event.preventDefault()
    this.end(index)
  }

  public onTouchStart(event: TouchEvent, index: number) {
    event.preventDefault()
    // Make sure that we start a new note.
    //end(index) ???
    this.start(index)
  }

  public onTouchCancel(event: TouchEvent, index: number) {
    event.preventDefault()
    this.end(index)
  }

  public onTouchEnd(event: TouchEvent, index: number) {
    event.preventDefault()
    this.end(index)
  }

//   public onTouchMove(event: TouchEvent, index: number) {
//     console.log("move",index,event)
//     //event.preventDefault()
//     //this.end(index)
//   }
}
