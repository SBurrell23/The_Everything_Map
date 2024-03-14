<template>
  <div class="main"> 
    <div id="logo">
      The Everything Map
    </div>
    <div class="row m-0">
      
      <div class="col-2">
        <div>
          <!-- <br>
          <input class="form-control" type="text" id="inputField" @keyup.enter="callComboAPI()" v-model="newWord">
          <br>  -->
          <div class="wordBank">
            <input class="form-control wordBankSearch" type="text" placeholder="Search Everything" v-model="bankSearch">
            <div class="wordBankItems">
              <div v-for="word in filteredWordBank" :key="word.id" class="word-item">
                <div class="wordBankItem" tabindex="0" @click="wordBankClicked($event,word.id)"> {{ word.id }} {{word.emoji}} </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-10" style="padding-left: 0px;">
        <network 
        ref="network"
        id="network" 
        :nodes="nodes" 
        :edges="edges" 
        :options="options"
        @select-node="nodeSelected"
        ></network>
      </div>

    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { Network } from 'vue-visjs';

export default {
  name: 'App',
  components: {
    Network
  },
  props: {
    msg: String
  }, 
  computed: {
    filteredWordBank(){
      return this.wordBank.filter(word => word.id.includes(this.bankSearch));
    }
  },
  data() {
    return {
      url :"https://the-everything-map.onrender.com",//https://the-everything-map.onrender.com
      newWord: "",
      response: "",
      currentNode: "everything",
      wordBankFocus: null,
      wordBank:[],
      bankSearch:"",
      thinkInterval: null,
      loading: false,
      nodes: [
        { id: "everything", label: "♾️ everything" }
      ],
      edges: [],
      options: {
        interaction: {
          hover: true,
        },
        nodes: {
          color: {
            hover: {
              border: '#4294d6',
              background: '#c4e5ff'
            },
            highlight: {
              border: '#58c45c', 
              background: '#baffbc'
            },
            background: '#ffffff',
            border: '#d7d7d7',
          },
          shape: 'box',
          font:{
            size:20
          }
        },
        edges:{
          font:{
            size: 10,
            background: '#ffffff',
            color: '#343434',
          },
          dashes: true
        },
        physics:{
          enabled: true,
          barnesHut: {
            theta: 0.5,
            gravitationalConstant: -5500,
            centralGravity: 0.18,
            springLength: 35,
            springConstant: 0.08,
            damping: 0.95,
            avoidOverlap: .15
          },
          stabilization: {
            enabled: true,
            iterations: 2000,
            updateInterval: 100,
            onlyDynamicEdges: false,
            fit: true
          },
        }
      }
    };
  },
  methods: {
    callComboAPI() {
      if(this.loading){
        this.$refs.network.unselectAll();
        return;
      }
      this.loading = true;
      const url = this.url + "/api/combine?word1=" + this.currentNode + "&word2=" + this.newWord;
      axios.get(url, { timeout: 3500 }).then(response => {
        //console.log(response.data);
        this.response = this.parseData(response.data,this.currentNode);
        this.$refs.network.unselectAll();
        this.currentNode = null;
      }).catch(error => {
        console.error(error);
        clearInterval(this.thinkInterval);
        const audio = new Audio(require('@/assets/failure.mp3'));
        audio.volume = 0.2;
        audio.play();
      }).finally(() => {
        this.loading = false;
        if(this.wordBankFocus != null){
          this.wordBankFocus.blur();
          this.wordBankFocus = null;
        }
      });
    },
    callThoughtAPI(type) {
      const url = this.url + "/api/thought";
      axios.get(url, { timeout: 5000 }).then(response => {
        this.newWord = response.data.toLowerCase().trim();
        if(type == "manual")
          this.callComboAPI();
        else if(type == "ai")
          this.think();
      }).catch(error => {
        console.error(error);
      });
    },
    wordBankClicked(event,clickedWord){
      if(this.currentNode == null){
        this.currentNode = clickedWord;
        this.newWord = "everything";
      }
      else
        this.newWord = clickedWord;

      this.wordBankFocus = event.target;
      this.wordBankFocus.focus();
      this.callComboAPI();
    },
    think() {
      this.callComboAPI();
      this.thinkInterval = setInterval(() => {
        this.chooseRandomWordFromBankAndCombine();
      }, 2000);
    },
    chooseRandomWordFromBankAndCombine(){
      const randomIndex = Math.floor(Math.random() * this.wordBank.length);
      this.currentNode = this.wordBank[randomIndex].id;
      const randomIndex2 = Math.floor(Math.random() * this.wordBank.length);
      this.newWord = this.wordBank[randomIndex2].id;
      this.callComboAPI();
    },
    parseData(data) {
      const objectsArray = data.split(",").map(el => {
        const [word, emoji] = el.split(":");
        return {word, emoji};
      });
      var addedNodes = 0;
      for (let i = 0; i < objectsArray.length; i++) 
      {
        const el = objectsArray[i];
        el.word = el.word.toLowerCase().trim().replace(/['"]+/g, '');
        if(this.containsEmoji(el.emoji) == false || el.word.includes("undefined") || el.emoji.includes("undefined"))
          continue;
        if (!this.nodes.some(node => node.id === el.word)) {
          this.nodes.push({
            label: el.emoji + " " + el.word ,
            id: el.word,
            x:this.nodeXY(this.currentNode).x + (Math.random() - 0.5) * 100,
            y:this.nodeXY(this.currentNode).y + (Math.random() - 0.5) * 100
          });
          this.wordBank.push({
            id: el.word,
            emoji: el.emoji
          });
          addedNodes++;
        }
        const edgeExists = this.edges.some(edge => 
          (edge.from === this.currentNode && edge.to === el.word) ||
          (edge.from === el.word && edge.to === this.currentNode) || 
          (edge.from === this.currentNode && edge.to === this.currentNode) ||
          (edge.from === el.word && edge.to === el.word) || 
          (edge.from === el.word || edge.to === el.word) //Remove this for all connections 
        );
        if (!edgeExists) {
          this.edges.push({from: this.currentNode, to: el.word , label: this.newWord.toLowerCase().trim()});
        }
      }
      if(addedNodes > 0){
        const audio = new Audio(require('@/assets/success.mp3'));
        audio.volume = 0.25;
        audio.play();
      }else{
        const audio = new Audio(require('@/assets/failure.mp3'));
        audio.volume = 0.2;
        audio.play();
      }
        
    },
    nodeXY(nodeToFind){
      var allNodes = this.$refs.network.getPositions();
      return allNodes[nodeToFind];
    },
    containsEmoji(text) {
      const emojiRegex = /[\p{Emoji}]/gu;
      return emojiRegex.test(text);
    },
    nodeSelected(event) {
      //console.log('Selected node:', event.nodes[0]);
      if(this.currentNode == "everything" && this.edges.length == 0)
        this.callThoughtAPI("manual");
      else if(this.currentNode == event.nodes[0]){
        return;
      }
      else if(this.currentNode == null){
        this.currentNode = event.nodes[0];
      }else{
        this.newWord = this.currentNode;
        this.currentNode = event.nodes[0];
        this.$refs.network.selectNodes([this.newWord, this.currentNode]);
        this.callComboAPI();
      }
    },
      
  },
  mounted() {
    this.$refs.network.on("hoverNode", function () {
      document.getElementById('network').style.cursor = 'pointer';
    });
    this.$refs.network.on("blurNode", function () {
      document.getElementById('network').style.cursor = 'default';
    });
    this.$refs.network.on("deselectNode", (params) => {
      if(params.nodes.length == 0) //Clicked on empty space, reset current node
        this.currentNode = null;
    });
    clearInterval(this.thinkInterval);
    // this.callThoughtAPI('ai');
  },
  unmounted() {
    clearInterval(this.thinkInterval);
  }
}
</script>


<style scoped>
#network {
  height: calc(100vh - 30px);  /* or any other value */
  margin-top:15px;
  border:solid 1px rgb(224, 224, 224);
  border-radius: 4px;
  -webkit-box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  -moz-box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
}

.wordBank{
  border:solid 1px rgb(224, 224, 224);
  background-color: rgb(250, 251, 253);
  height:calc(100vh - 30px);
  border-radius: 4px;
  direction: rtl;
  margin-top: 15px;
  -webkit-box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  -moz-box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  padding:5px;
}
.wordBankItems{
  overflow-y: auto;
  height:calc(100vh - 88px);
}
.wordBankItem{
  padding: 4px;
  border: solid 1px rgb(213, 213, 213);
  background-color: white;
  cursor: pointer;
  border-radius: 4px;
  margin:3px;
  float:left;
  -webkit-box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  -moz-box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  box-shadow: -4px 6px 20px -15px rgba(0,0,0,0.75);
  user-select: none;
  font-size:16px;
}
.wordBankItem:hover{
  border-color: #4294d6;
  background-color: #c4e5ff;
}
.wordBankItem:focus{
  border-color: #58c45c;
  background-color: #baffbc;
}
.wordBankSearch{
  direction: ltr;
  margin-bottom:5px;
  margin-top:2px;
}
@import url('https://fonts.googleapis.com/css2?family=Shadows+Into+Light');

#logo{
  position: absolute;
  top: 20px;
  right:30px;
  font-family: 'Shadows Into Light', sans-serif;
  font-size: 35px;
}
</style>
