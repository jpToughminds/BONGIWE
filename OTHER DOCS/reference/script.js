  function addBag(){
    const n=document.getElementById('count');
    n.textContent=Number(n.textContent)+1
}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
