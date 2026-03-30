import { useState } from 'react';

function App() {
  const [item, setItem] = useState('');
  const [valor, setValor] = useState('');

  const finalizarCompra = async () => {
    const valorNum = parseFloat(valor);
    if (!item.trim()) {
      alert("Digite o nome do item antes de finalizar.");
      return;
    }
    if (!valor || isNaN(valorNum) || valorNum <= 0) {
      alert("Digite um valor válido antes de finalizar.");
      return;
    }
    await fetch('http://localhost:3001/venda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Math.floor(Math.random() * 999), item, valor: valorNum })
    });
    alert("Compra enviada para processamento!");
    setItem('');
    setValor('');
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Loja do Everton 🎸</h1>
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Nome do item"
          style={{ padding: '10px', fontSize: '18px', width: '220px' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Digite o valor (R$)"
          style={{ padding: '10px', fontSize: '18px', width: '220px' }}
        />
      </div>
      <button
        onClick={finalizarCompra}
        style={{ padding: '20px 40px', fontSize: '20px', cursor: 'pointer' }}
      >
        Finalizar Compra
      </button>
    </div>
  );
}

export default App;