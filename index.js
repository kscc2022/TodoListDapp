
const version = "v0.0.1";

const contractAddress = "0x1B6535Db0B7E8A1F20Dbb00AC2b95179dB4C046B";
let web3;

let contractABI;
let walletAddress = "";
let statusMessages = [];

window.onload = function() {
  loadContractABI();
  document.getElementById('version').innerText = version;
}

const loadContractABI = async () => {
  const response = await fetch('abi.json');
  const responseJSON = await response.json();
  contractABI = responseJSON['abi'];
}

const connectWallet = async () => {
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  document.getElementById("connect_button").innerText = "CONNECTED";
  web3 = new Web3(window.ethereum);
  walletAddress = web3.utils.toChecksumAddress(accounts[0]);
  document.getElementById("account_address").innerText = `address: ${walletAddress}`;
  refreshTasks();
}

const createTodo = async () => {
  const inputText = document.getElementById('create_todo_input').value;
  if (inputText) {
    await sendCreateTodoTx(inputText);
    refreshTasks();
  }
}

const sendData = async (data) => {
  let tx = await getTxOf(data);
  const txHash = await sendTx(tx);
  updateStatus("TX SUCCEEDED");
  return txHash;
}

const sendCreateTodoTx = async (todoText) => {
  const contract = getContract();
  const data = await contract.methods.createTask(todoText).encodeABI();
  await sendData(data);
}

function getContract() {
  const contract = new web3.eth.Contract(contractABI, contractAddress);
  return contract;
}

const getTaskCount = async (contract) => {
  const count = await contract.methods.taskCount().call();
  return count;
}

const getTasks = async () => {
  const contract = await getContract();
  const count = await getTaskCount(contract);
  let tasks = [];
  for (let i = 1; i <= count; i++) {
    const task = await contract.methods.tasks(i).call();
    tasks.push(task);
  }
  return tasks;
}

const getTxOf = async (data) => {
  // Metamsk の確認を挟む TX は gas 系の計算不要
  const tx = {
    'from': walletAddress,
    'to': contractAddress,
    'value': 0,
    'data': data,
  };
  return tx;
}

const sendTx = async (tx) => {
  updateStatus('WILL SEND TX');
  const txHash = await web3.eth.sendTransaction(tx);
  console.log(txHash);
  updateStatus('SENT TX:' + txHash["transactionHash"]);
  return txHash;
}

const taskComponent = (number, task) => {
  return `
    <p>
      <input type='checkbox'
        onChange='toggleCheckBox(${number+1})'
        ${(task.isCompleted ? 'checked' : '')}
      />
      <input type='text'
        value='${task.content}'
        onChange='updateTaskContent(${number+1}, this.value)'
      />
      <button
        onClick='deleteTask(${number+1})'
      >
        DELETE
      </button>
    </p>
  `;
}

const updateTaskContent = async (number, content) => {
  console.log(content)
  await sendUpdateContentTx(number, content);
}

const sendUpdateContentTx = async (number, content) => {
  const contract = getContract();
  const data = await contract.methods.updateContent(number, content).encodeABI();
  await sendData(data);
  await refreshTasks();
}

const deleteTask = async (number) => {
  await sendDeleteTaskTx(number);
}

const sendDeleteTaskTx = async (number) => {
  const contract = getContract();
  const data = await contract.methods.deleteTask(number).encodeABI();
  await sendData(data);
  await refreshTasks();
}

const refreshTasks = async () => {
  const tasks = await getTasks();

  let tasksHTML = "";
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task.isDeleted) { continue; }
    if (task.ownerAddress != walletAddress ) { continue; }
    tasksHTML += taskComponent(i, task);
  }

  document.getElementById('todo_list').innerHTML = tasksHTML;
}

const toggleCheckBox = async (number) => {
  await sendToggleIsCompletedTx(number);
}

const sendToggleIsCompletedTx = async (number) => {
  const contract = getContract();
  const data = await contract.methods.toggleIsCompleted(number).encodeABI();
  await sendData(data);
  await refreshTasks();
}

function updateStatus(message) {
  const messageWithDate = new Date() + ": " + message;
  console.log(messageWithDate);

  statusMessages.unshift(messageWithDate);
  let mergedMessage = "";

  const maxCount = 30;
  if (statusMessages.length > maxCount) {
    statusMessages.pop();
  }

  for (const statusMessage of statusMessages) {
    mergedMessage += "<p>" + statusMessage + "</p>";
  }

  document.getElementById('status_message').innerHTML = mergedMessage;
}
