<script setup lang="ts">
import { NoteInputHandler, type NoteOnCallback } from '@/noteInputHandler';

const props = defineProps<{
    noteOn: NoteOnCallback
}>()

const noteInputHandler = new NoteInputHandler(props.noteOn);
/*
           @pointerdown="noteInputHandler.onPointerDown($event, 60 + index)"
        @pointerup="noteInputHandler.onPointerUp($event, 60 + index)"
        @pointerover="noteInputHandler.onPointerEnter($event, 60 + index)"
        @pointerleave="noteInputHandler.onPointerLeave($event, 60 + index)"
        @pointermove="noteInputHandler.onPointerMove($event, 60 + index)"
        */

</script>

<template>

    <h1>FretboardView</h1>
    <div class="note" 
        v-for="index in 10" :key="index" 
        @mousedown="noteInputHandler.onMouseDown($event, 60 + index)"
        @mouseup="noteInputHandler.onMouseUp($event, 60 + index)"
        @mouseenter="noteInputHandler.onMouseEnter($event, 60 + index)"
        @mouseleave="noteInputHandler.onMouseLeave($event, 60 + index)"
        @touchstart="noteInputHandler.onTouchStart($event, 60 + index)"
        @touchend="noteInputHandler.onTouchEnd($event, 60 + index)"
        @touchcancel="noteInputHandler.onTouchCancel($event, 60 + index)"
        @touchmove="noteInputHandler.onTouchMove($event, 60 + index)"

     
        
        >Note {{ index }}</div>
</template>

<style>
.note {
    user-select: none;
    cursor: pointer;
    background-color: gray;
    border: 1px solid black;
    display: inline-block;
}
</style>