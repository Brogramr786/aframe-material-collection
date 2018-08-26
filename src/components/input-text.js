/* global AFRAME,TWEEN,THREE */
/**
 * Text input component Component for aframe-material-collection. Includes support for number/int only input.
 * @namespace aframe-material-collection
 * @component ui-text-input
 * @author Shane Harris
 */

module.exports = AFRAME.registerComponent('ui-input-text', {
    depends:['text'],
    schema: {
        value: {default: ''},
        disabled: {type: 'boolean', default: false},
        type: {default: 'text'},
        cameraEl:{type:'selector'},
        width:{type:'number',default:1},
        height:{type:'number',default:0.2},
        lookControlsComponent:{default:'look-controls'},
        wasdControlsComponent:{default:'wasd-controls'},
        placeHolder:{default:'Text...'}
    },
    init(){
        this.setupElements();
        this.text.addEventListener('textfontset',()=>{
            this.startSelection = 0;
            this.scrollOffset = 0;
            this.alphabet = {};
            this.scrollIndex = 0;
            let chars = this.data.value.split('');
            this.chars = [];
            this.charsAllowed = ['-','_','+','=','{','}','[',']',':',';','\'','@','~','#','<','>',',','.','?','/','|','\\','`','¬'];
            for(let i = 0; i < chars.length; i++){
                this.chars.push({char:chars[i]});
            }
            this.blurHandler = ()=>this.blur();
            this.isMoving = false;
            let mousemove = this.onMousemove.bind(this);
            this.keydown = e=>this.handleKeyboardEvent(e);
            this.backing.addEventListener('mousedown',()=>{
                this.focus();
                this.playPauseCamera('pause');
                this.backing.addEventListener('ui-mousemove',mousemove);
            });
            this.el.sceneEl.addEventListener('mouseup',()=>{
                this.backing.removeEventListener('ui-mousemove',mousemove);
                this.isMoving = false;
                this.setSelection(this.text.selectionStart,this.text.selectionLength)
            });
            //this.el.addEventListener('dblclick',()=>this.selectAll());
            this.el.setAttribute('visible',false);
            setTimeout(()=>{
                this.setValue();
                this.setupScrollClips();
                this.el.setAttribute('visible',true);
            });
        });
    },
    setupScrollClips(){
        this.content_clips = [
            new THREE.Plane( new THREE.Vector3( -1, 0, 0 ), 0 ),
            new THREE.Plane( new THREE.Vector3( 1, 0, 0 ), 0 )
        ];
        this.setScrollClips();
    },
    selectAll(){
        this.text.selectionStart = 0;
        this.text.selectionLength = this.chars.length;
        this.setValue();
    },
    increaseWrap(){
        let child = this.text.object3D.children[this.text.object3D.children.length-1];
        if(child.geometry.layout._linesTotal>1){
            this.text.setAttribute('width',this.text.getAttribute('width')*1.2);
            this.text.setAttribute('wrap-pixels',this.text.getAttribute('width')*500);
            this.text.setAttribute('x-offset',((this.text.getAttribute('width')-this.data.width)/2));
            this.increaseWrap();
        }
    },
    setScrollClips(){
        this.text.object3D.updateMatrixWorld();
        this.content_clips[0].set(new THREE.Vector3( -1, 0, 0 ), (this.data.width/2)+0.005);
        this.content_clips[1].set(new THREE.Vector3( 1, 0, 0 ), (this.data.width/2)+0.005);
        this.content_clips[0].applyMatrix4(this.backing.object3D.matrixWorld);
        this.content_clips[1].applyMatrix4(this.backing.object3D.matrixWorld);

        let child = this.text.object3D.children[this.text.object3D.children.length-1];
        child.material.clippingPlanes = this.text._content_clips?this.text._content_clips.concat(this.content_clips):this.content_clips;
        let selectionHeight = this.selectionHighlight.getObject3D('mesh');
        if(selectionHeight){
            selectionHeight.material.clippingPlanes = this.text._content_clips?this.text._content_clips.concat(this.content_clips):this.content_clips;
        }
        let carret = this.carret.getObject3D('mesh');
        if(carret){
            carret.material.clipShadows = true;
            carret.material.needsUpdate = true;
            carret.material.clippingPlanes = this.text._content_clips?this.text._content_clips.concat(this.content_clips):this.content_clips;
        }
    },
    numberOnly(e,is_float){
        // Stolen from stack overflow.
        if ([46, 8, 9, 27, 13, 110].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl/cmd+A
            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
            // Allow: Ctrl/cmd+C
            (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
            // Allow: Ctrl/cmd+X
            (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            // let it happen, don't do anything
            return true;
        }
        // Regex to allow float/int input - float inpit allows "0." for as you type numbers - need to remove on blur.
        // TODO: Need to remove trailing dot on blur to make a valid number.
        let output = '';
        for(let i = 0; i < this.chars.length; i++){
            output+=this.chars[i].char;
        }
        if(e){
            return ((is_float?/^\d*((\.)|(\.\d+))?$/g:/^\d*?$/g).test(output+e.key));
        }

    },
    floatOnly(e){
        return this.numberOnly(e,true);
    },
    focus(){
        this.carretTweens = this.setupCarret();
        UI.utils.isChanging(this.el.sceneEl,this.text.object3D.uuid);
        this.setValue();
        this.setScrollClips();
        setTimeout(()=>this.el.sceneEl.addEventListener('mousedown',this.blurHandler),50);
        window.addEventListener('keydown', this.keydown);
        this.underline.setAttribute('height',0.008);
        this.underline.setAttribute('color','#009688');
    },
    blur(){
        this.carretTweens[0].stop();
        this.carretTweens[1].stop();
        this.carret.getObject3D('mesh').material.opacity = 0;
        this.el.sceneEl.removeEventListener('mousedown',this.blurHandler);
        this.playPauseCamera('play');
        window.removeEventListener('keydown', this.keydown);
        UI.utils.stoppedChanging(this.text.object3D.uuid);
        this.underline.setAttribute('height',0.005);
        this.underline.setAttribute('color','#bfbfbf');
        if(this.chars.length&&this.chars[this.chars.length-1].char==='.'&&this.data.type==="number"){
            this.chars.pop();
            this.setValue();
        }
    },
    handleKeyboardEvent(e){
        if(e.keyCode===88&&e.ctrlKey) { //CTRL + X
            // TODO: Clipboard API?? - https://stackoverflow.com/questions/6413036/get-current-clipboard-content
        }if(e.keyCode===67&&e.ctrlKey) { //CTRL + C

        }else if(e.keyCode===86&&e.ctrlKey) { //CTRL + V

        }else if(e.keyCode===65&&e.ctrlKey) { //CTRL + A
            this.text.selectionStart = 0;
            this.text.selectionLength = this.chars.length;
        }else if(e.code.indexOf('Key')>-1||e.code.indexOf('Digit')>-1||this.charsAllowed.indexOf(e.key)>-1){
            let check = true;
            switch(this.data.type){
                case "number":
                    check = this.floatOnly(e);
                    break;
                case "int":
                    console.log(this.numberOnly(e));
                    check = this.numberOnly(e);
                    break;
            }
            if(check){
                this.chars.splice(this.text.selectionStart,this.text.selectionLength,{char:e.key});
                this.text.selectionStart++;
                this.text.selectionLength = 0;
            }
        }else if(e.keyCode===46){// Delete
            this.chars.splice(this.text.selectionStart,this.text.selectionLength||1);
            this.text.selectionStart = this.text.selectionStart>this.chars.length?this.chars.length:this.text.selectionStart;
            this.text.selectionLength = 0;
        }else if(e.keyCode===39){
            if(!e.shiftKey){
                if(this.text.selectionLength){
                    this.text.selectionStart+=this.text.selectionLength;
                }else{
                    this.text.selectionStart++;
                }
                this.text.selectionLength = 0;
                if(this.text.selectionStart>this.chars.length)this.text.selectionStart = this.chars.length;
                delete this.shiftStartPos
            }else{
                if(!this.shiftStartPos){
                    this.shiftStartPos = this.text.selectionStart;
                }
               if(this.text.selectionStart<this.shiftStartPos){
                    this.text.selectionStart++;
                    this.text.selectionLength=Math.abs(this.shiftStartPos-this.text.selectionStart);
                }else{
                    this.text.selectionLength++;
                }

            }
        }else if(e.keyCode===37){
            if(!e.shiftKey) {
                if (!this.text.selectionLength) {
                    this.text.selectionStart--;
                }
                this.text.selectionLength = 0;
                if (this.text.selectionStart < 0) this.text.selectionStart = 0;
                delete this.shiftStartPos
            }else{
                if(!this.shiftStartPos){
                    this.shiftStartPos = this.text.selectionStart;
                }
                if(this.text.selectionStart+this.text.selectionLength>this.shiftStartPos){
                    this.text.selectionLength--;
                }else{
                    this.text.selectionStart--;
                    this.text.selectionLength=Math.abs(this.shiftStartPos-this.text.selectionStart);
                }
            }
        }else{
            if(this.text.selectionLength) {
                if(e.keyCode===8) {// Backspace
                    this.chars.splice(this.text.selectionStart, this.text.selectionLength  );
                    this.text.selectionLength = 0;
                }
            }else{
                if(e.keyCode===8){// Backspace
                    if(this.text.selectionStart){
                        this.chars.splice(this.text.selectionStart-1,this.text.selectionLength||1 );
                        this.text.selectionStart = this.text.selectionStart-1;
                    }
                }else if(e.keyCode===32){ // Space
                    this.chars.splice(this.text.selectionStart,0,{char:' '});
                    this.text.selectionStart++;
                }
            }

        }
        this.setValue();
        this.carret.getObject3D('mesh').material.opacity = 1;
        e.preventDefault();
        e.stopPropagation();
    },
    setValue(){
        this.setScrolledValue();
        this.setCharacters();
        this.setSelection(this.text.selectionStart,this.text.selectionLength);
        this.increaseWrap();
    },
    setScrolledValue(){
        let output = '';
        for(let i = 0; i < this.chars.length; i++){
            output+=this.chars[i].char;
        }
        this.text.setAttribute('value',output);
        if(!this.chars.length){
            this.text.setAttribute('color','#bfbfbf');
            this.text.setAttribute('value',this.data.placeHolder);
        }else{
            this.text.setAttribute('value',output);
            this.text.setAttribute('color','#2f2f2f');
        }
    },
    onMousemove(e){
        let currentSelection = this.getSelectionPosition(e);
        if(!this.isMoving){
            this.isMoving = true;
            this.startSelection = currentSelection;
        }
        let selection = this.getNearestGlyph(this.startSelection,currentSelection);
        this.selectionHighlight.setAttribute('scale',(selection.end-selection.start)+' 1 1');
        this.selectionHighlight.setAttribute('position',(selection.start+((selection.end-selection.start)/2))+' 0 0.001');
        this.carret.setAttribute('position',selection.end+' 0 0.001');

    },
    setupElements(){


        this.container = document.createElement('a-entity');
        this.container.setAttribute('position',(this.data.width/2)+' 0 0');

        this.text = document.createElement('a-text');
        this.text.setAttribute('color','#2f2f2f');
        this.text.setAttribute('anchor','center');
        this.text.setAttribute('align','left');
        this.text.setAttribute('width',this.data.width);
        this.text.setAttribute('wrap-pixels',this.data.width*500);
        this.text.className = 'no-yoga-layout';
        this.text.setAttribute('height',this.data.height);
        this.text.setAttribute('value',this.data.value);
        this.container.appendChild(this.text);

        this.selectionHighlight = document.createElement('a-plane');
        this.selectionHighlight.setAttribute('width',1);
        this.selectionHighlight.setAttribute('scale','0 1 1');
        this.selectionHighlight.setAttribute('height',0.16);
        this.selectionHighlight.setAttribute('transparent',true);
        this.selectionHighlight.className = 'no-yoga-layout';
        this.selectionHighlight.setAttribute('color','#009688');
        this.selectionHighlight.setAttribute('shader','flat');
        this.selectionHighlight.setAttribute('opacity',0.3);
        this.selectionHighlight.setAttribute('position','0 0 0.001');
        this.text.appendChild(this.selectionHighlight);

        this.carret = document.createElement('a-plane');
        this.carret.setAttribute('width',0.01);
        this.carret.setAttribute('height',0.12);
        this.carret.setAttribute('transparent',true);
        this.carret.setAttribute('opacity',0);
        this.carret.setAttribute('shader','flat');
        this.carret.className = 'no-yoga-layout';
        this.carret.setAttribute('color','#009688');
        this.carret.setAttribute('position','0 0 0.001');
        this.text.appendChild(this.carret);



        this.backing = document.createElement('a-plane');
        this.backing.className = 'intersectable no-yoga-layout';
        this.backing.setAttribute('width',this.data.width+0.1);
        this.backing.setAttribute('height',this.data.height);
        this.backing.setAttribute('color','white');
        this.backing.setAttribute('shader','flat');
        this.container.appendChild(this.backing);



        this.underline = document.createElement('a-plane');
        this.underline.setAttribute('width',this.data.width);
        this.underline.setAttribute('height',0.005);
        this.underline.className = 'no-yoga-layout';
        this.underline.setAttribute('shader','flat');
        this.underline.setAttribute('color','#bfbfbf');
        this.underline.setAttribute('position','0 -0.072 0.001');
        this.container.appendChild(this.underline);

        this.el.appendChild(this.container);
    // <a-plane class="intersectable" width="1" height="0.2"
    //     color="white" shader="flat" ui-double-click>
    //     <a-text class="no-yoga-layout" color="#000000" white-space="pre" anchor="center" align="left"
    //     width="2"
    //     height="0.2"
    //     value="0123456789-10-11-12-13-14-15-16 consectetur adipiscing elit. "
    //         ></a-text>
    //         </a-plane>


    },
    setupCarret(){
        let material = this.carret.getObject3D('mesh').material;
        let tween = new TWEEN.Tween({x:material.opacity})
            .to({ x: 1 }, 250)
            .delay(100)
            .onUpdate(function(){
                material.opacity = this.x;
            })
            .easing(TWEEN.Easing.Circular.Out);
        let tweenBack = new TWEEN.Tween({x:material.opacity})
            .to({x:0}, 250)
            .onUpdate(function(){
                material.opacity = this.x;
            })
            .delay(100)
            .easing(TWEEN.Easing.Circular.Out);
        tween.chain(tweenBack);
        tweenBack.chain(tween);
        tween.start();
        return [tween,tweenBack];
    },
    getSelectionPosition(e){
        this.el.object3D.updateMatrixWorld();
        return this.text.object3D.worldToLocal(e.detail.intersection.point.clone()).x
    },
    playPauseCamera(method){
        if(this.data.cameraEl){
            if(this.data.cameraEl.components[this.data.lookControlsComponent]) {
                this.data.cameraEl.components[this.data.lookControlsComponent][method]();
            }
            if(this.data.cameraEl.components[this.data.wasdControlsComponent]) {
                this.data.cameraEl.components[this.data.wasdControlsComponent][method]();
            }
            if(method==="play"){
                document.querySelector('a-scene').setAttribute('keyboard-shortcuts',"enterVR: true")
            }
            if(method==="pause"){
                document.querySelector('a-scene').setAttribute('keyboard-shortcuts',"enterVR: false")
            }
        }
    },
    setCharacters(){
        this.positions = [];
        let child = this.text.object3D.children[this.text.object3D.children.length-1];
        if(!this.chars.length||!child)return;
        let glyphs = child.geometry.layout.glyphs;
        let scale = child.scale.x;
        let lastPosition = 0;
        for(let i = 0; i < glyphs.length; i++){
            let glyph = glyphs[i];
            let currentWidth = (this.chars[i].char===' '?20:glyph.data.width);
            let current = (((glyph.position[0]+currentWidth+glyph.position[1])*scale)+0.08);
            if(i===0){
                lastPosition = (((glyph.position[0]+glyph.position[1])*scale)+0.08)
            }
            if(!this.chars[i].id){
                this.chars[i].id=glyph.data.id;
                this.chars[i].width = current-lastPosition;
            }
            this.chars[i].left = lastPosition;
            lastPosition = current;
        }
    },
    getNearestGlyph(startPosition,endPosition){
        let width = Number(this.text.getAttribute('width'));
        let parentWidth = this.data.width;
        if(endPosition<startPosition){
            let tempPosition = endPosition;
            endPosition = startPosition;
            startPosition = tempPosition;
        }
        if(startPosition<-parentWidth/2){
            startPosition = -parentWidth/2;
        }
        if(endPosition>width-parentWidth/2){
            endPosition = width-parentWidth/2;
        }
        let startDiff = Number.POSITIVE_INFINITY;
        let endDiff = Number.POSITIVE_INFINITY;
        let output = {start:0,end:0};
        if(this.chars.length){
            for(let i = 0; i <= this.chars.length; i++){
                let position = this.chars[i===this.chars.length?i-1:i];
                let currentPosition = (i===this.chars.length?position.left+position.width:position.left)-(parentWidth)/2;
                if(Math.abs(startPosition-currentPosition)<startDiff){
                    startDiff = Math.abs(startPosition-currentPosition);
                    output.start = currentPosition;
                    this.text.selectionStart = i;
                }
                if(Math.abs(endPosition-currentPosition)<endDiff){
                    endDiff = Math.abs(endPosition-currentPosition);
                    output.end = currentPosition;
                    this.text.selectionLength = i-this.text.selectionStart;
                }
            }
        }
        return output;
    },
    setSelection(start,length){
        this.text.selectionStart = start;
        this.text.selectionLength = length;
        let right = 0,left = 0;
        for(let i = 0; i < this.chars.length; i++){
            let position = this.chars[i];
            if(i>=start&&i<start+length+1){
                let current = position.left;
                if(i===start){
                    left = current
                }
                right = current;
            }
        }
        let end = this.chars.length?this.chars[this.chars.length-1].left+this.chars[this.chars.length-1].width:0;
        if(start+length===this.chars.length){
            right = end
        }
        if(start===this.chars.length){
            left = right = end
        }
        let parentWidth = this.data.width;
        this.selectionHighlight.setAttribute('scale',(right-left)+' 1 1');
        this.selectionHighlight.setAttribute('position',(left+((right-left)/2)-((parentWidth)/2))+' 0 0.001')
        let carretPosition = (right-((parentWidth)/2));
        this.carret.setAttribute('position',carretPosition+' 0 0.001');

        if(carretPosition>(parentWidth/2)-this.scrollOffset){
            this.scrollOffset = -(carretPosition-(parentWidth/2));
            this.text.setAttribute('position',this.scrollOffset+' 0 0');
        }

        if((carretPosition+parentWidth/2)<-this.scrollOffset){
            this.scrollOffset+=(-this.scrollOffset-(carretPosition+parentWidth/2));
            if(this.scrollOffset>0)this.scrollOffset=0;
            this.text.setAttribute('position',this.scrollOffset+' 0 0');
        }
    },
    updateSchema() {
    }
});
//