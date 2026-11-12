import {api} from "../../../js/shared/api.js";

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id), user = await api.getDesigner();
  if (!user) return;
  const specialties = ['Alfaiataria','Jeanswear / Denim','Malharia','Patchwork','Bordado / Aplicações','Tingimento Natural','Acessórios / Bolsas','Upcycling Estrutural','Crochê / Tricô'];
  const experience = ['Menos de 1 ano','1 a 3 anos','3 a 5 anos','5 a 10 anos','Mais de 10 anos'];
  const specialtyGrid = document.querySelector('.tag-selector__grid');
  specialtyGrid.replaceChildren();
  specialties.forEach((name,index)=>{const id=`specialty-${index}`,wrap=document.createElement('div');wrap.className='tag-chip';wrap.innerHTML=`<input type="checkbox" class="tag-chip__input" id="${id}" name="especialidades" value="${name}"><label class="tag-chip__label" for="${id}">${name}</label>`;specialtyGrid.appendChild(wrap);});
  const exp=$('experiencia');exp.replaceChildren(new Option('Selecione...',''),...experience.map(x=>new Option(x,x)));
  const manifesto=$('manifesto');const bio=document.createElement('textarea');bio.id='sobreMim';bio.className='form-textarea';bio.placeholder='Conte um pouco sobre sua trajetória e seu trabalho.';bio.setAttribute('aria-label','Sobre mim');manifesto.parentElement.before(bio);
  $('apelido').value=user.nomeProfissional||user.nome||'';$('nomeCompleto').value=user.razaoSocial||user.nomeProfissional||user.nome||'';$('documento').value=user.documento||'';$('email').value=user.email||'';$('telefone').value=user.telefone||'';$('cep').value=user.cep||'';$('cidadeEstado').value=[user.cidade,user.uf].filter(Boolean).join(' / ');$('logradouro').value=[user.logradouro,user.numero,user.complemento].filter(Boolean).join(', ');manifesto.value=user.manifesto||'';bio.value=user.sobreMim||'';$('instagram').value=user.instagram||'';$('website').value=user.portfolio||user.site||'';exp.value=user.faixaExperiencia||'';$('consentimentoPerfilPublico').checked=!!user.consentimentoPerfilPublico;
  const checked=new Set(user.especialidades||[]);document.querySelectorAll('input[name="especialidades"]').forEach(x=>x.checked=checked.has(x.value));
  $('profileForm').addEventListener('submit',async event=>{event.preventDefault();const selected=[...document.querySelectorAll('input[name="especialidades"]:checked')].map(x=>x.value);try{await api.atualizarPerfilConfeccionista(user.id,{nomeProfissional:$('apelido').value.trim(),razaoSocial:$('nomeCompleto').value.trim(),email:$('email').value.trim(),telefone:$('telefone').value,cep:$('cep').value,sobreMim:bio.value,manifesto:manifesto.value,instagram:$('instagram').value,portfolio:$('website').value,site:$('website').value,faixaExperiencia:exp.value,especialidades:selected,consentimentoPerfilPublico:$('consentimentoPerfilPublico').checked});const toast=$('toast');if(toast){$('toastMsg').textContent='Perfil atualizado com sucesso.';toast.classList.add('toast--visible');setTimeout(()=>toast.classList.remove('toast--visible'),3000);}}catch(error){alert(error.message);}});
});
