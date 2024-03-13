<template>
  <div class="main"> 
    <div class="row m-0">
      
      <div class="col-2">
        <div>
          <br>
          <input class="form-control" type="text" id="inputField" @keyup.enter="callComboAPI()" v-model="newWord">
          <br>
          <div class="wordBank">
            <div v-for="word in wordBank" :key="word.id" class="word-item">
              <div class="wordBankItem" @click="newWord=word.id;callComboAPI();"> {{ word.id }} {{word.emoji}} </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-10" style="padding-left: 0px;">
        <network 
        ref="network"
        class="network" 
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
  data() {
    return {
      newWord: "",
      response: "",
      currentNode: "nothing",
      wordBank:[],
      thinkInterval: null,
      nodes: [
        { id: "nothing", label: "🌌 nothing" }
      ],
      edges: [],
      options: {
        nodes: {
          color: '#ffffff',
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
      const url = "http://localhost:8080/api/combine?word1=" + this.currentNode + "&word2=" + this.newWord;
      axios.get(url, { timeout: 5500 }).then(response => {
        console.log(response.data);
        this.response = this.parseData(response.data);
        this.$refs.network.unselectAll();
        this.currentNode = null;
      }).catch(error => {
        console.error(error);
        clearInterval(this.thinkInterval);
      });
    },
    callThoughtAPI(type) {
      const url = "http://localhost:8080/api/thought";
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
      for (let i = 0; i < objectsArray.length; i++) 
      {
        const el = objectsArray[i];
        el.word = el.word.toLowerCase().trim();
        if(this.containsEmoji(el.emoji) == false || el.word.includes("undefined") || el.emoji.includes("undefined"))
          continue;
        if (!this.nodes.some(node => node.id === el.word)) {
          this.nodes.push({
            label: el.emoji + " " + el.word ,
            id: el.word
          });
          this.wordBank.push({
            id: el.word,
            emoji: el.emoji
          });
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
    },
    containsEmoji(text) {
      const emojiRegex = /[\p{Emoji}]/gu;
      return emojiRegex.test(text);
    },
    nodeSelected(event) {
      console.log('Selected node:', event.nodes[0]);
      if(this.currentNode == "nothing" && this.edges.length == 0)
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
    clearInterval(this.thinkInterval);
    this.callThoughtAPI('ai');
  },
  unmounted() {
    clearInterval(this.thinkInterval);
  }
}
</script>


<style scoped>
.network {
  height: calc(100vh - 20px);  /* or any other value */
}
.wordBank{
  border:solid 1px rgb(185, 185, 185);
  height:calc(100vh - 100px);
  border-radius: 4px;
  overflow-y: auto;
  direction: rtl;
}
.wordBankItem{
  padding: 4px;
  border: solid 1px rgb(185, 185, 185);
  cursor: pointer;
  border-radius: 4px;
  margin:3px;
  float:left;
}
.wordBankItem:hover{
  background-color: rgb(236, 236, 236);
}
</style>
