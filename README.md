# New Game Anime

Base pra um jogo novo com visual anime: 12 personagens VRoid prontos pro celular, com física de cabelo, franja, saia e busto
e as mesmas 23 animações (Mixamo + Quaternius). A preferida até agora é a **Shino**.

**Vila de teste:** https://rcandrerc.github.io/New-Game-Anime/ — mini vila jogável pra testar os personagens como num jogo:
joystick virtual (ou WASD), arrastar a tela gira a câmera, pinça aproxima/afasta, botão de câmera lenta (1x, ½x, ¼x), botões Correr, Pular (2x = mortal), Dash (arrancada com rastro), Esquiva (rolamento, mergulho ou deslizar) e ⋯ (estilos e outras animações); correndo contra algo de até ~1 m ela sobe apoiando as mãos; torre de 6 m pra escalar (gruda andando contra ela, joystick sobe/desce/lados, no topo sobe na beirada, Pular solta), escada de mão na frente da torre e um muro pra subir correndo pela parede;
boneco de treino de palha (balança e mostra o dano), espada na mão com Atacar (combo de 3 cortes), Salto giratório, Investida e Magia (bola de energia), com recarga nos botões; casinhas, árvores, fonte, caixotes e uma escadinha pra testar pulo e degrau. Os números de velocidade, pulo, cambalhota e dash
são os mesmos do Quimera Sandbox.

**Hábitos (esboço, celular em pé):** https://rcandrerc.github.io/New-Game-Anime/habitos.html — jogo estilo Habitica: hábitos (+/−), diárias e afazeres
embaixo; em cima a heroína joga a missão: 10 estágios (estilo Eternium). O jogo abre no mapa da missão, um pergaminho que rola na vertical, com os estágios ligados por caminhos. Cada estágio é uma fase separada, com mapa próprio
(bosque, lago, colina de pedras, campo de flores, pinheiral, floresta escura, covil do demônio…), grupos de monstros e um chefe numa clareira no fim;
dura de 1 a 3 minutos e cada um é mais difícil. Vencendo ou perdendo, volta pro mapa (no Auto a próxima fase começa sozinha depois de uns segundos).
Ela luta sozinha (Auto) ou com joystick e botões de skill (Manual). Só as tarefas dão XP; cada nível dá 3 pontos pra Força, Destreza, Vida,
Estamina e Magia (aba Heroína). Sem classe: Força libera as skills de espada e Magia as de magia, dá pra fazer híbrido. Monstros e estágios dão
ouro pra loja (poção, espada, armadura). Hábito ruim e diária esquecida tiram vida; se zerar, ela perde e recomeça o estágio. Música épica própria (botão 🎵 liga e desliga) e um puxador em cima das tarefas: toque ou arraste pra baixo e o jogo ocupa a tela toda. Tudo salvo no próprio celular.

**Galeria:** https://rcandrerc.github.io/New-Game-Anime/galeria.html — personagem parado no centro, um botão por animação.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `personagens/*.glb` | Os personagens prontos pro jogo (4 a 5,5 MB cada): texturas até 1024 px, partes juntadas por material (poucas draw calls), ossos com nomes simples (`hips`, `spine`, `head`, `upperarm.l`...), 23 animações e os dados da física dentro do arquivo |
| `js/vrm_char.js` | Código (Three.js) que prepara o modelo (material com luz e sombra no estilo anime) e roda a física do cabelo/roupa a cada quadro (`VRMC.prep`, `VRMC.tick`) |
| `index.html` | A vila de teste (jogável) |
| `galeria.html` | A galeria (ver cada animação parado) |
| `habitos.html` | Esboço do jogo de hábitos (estilo Habitica), em modo retrato |
| `tools/` | Ferramentas pra refazer a personagem ou trocar animações (`build_vrm.py`, leitor de FBX do Mixamo `fbxio.py`) |

## Personagens

| Arquivo | Nome | Licença |
|---|---|---|
| sendagaya_shino | Shino | CC0 |
| sendagaya_shibu | Shibu | CC0 |
| darkness_shibu | Darkness Shibu | CC0 |
| sakurada_fumiriya | Fumiriya | CC0 |
| victoria_rubin | Victoria Rubin | CC0 |
| vita | Vita | CC0 |
| vivi | Vivi | CC0 |
| hairsample_female / hairsample_male | Amostras de cabelo | CC0 |
| avatarsample_a / b / c | AvatarSample A, B, C | licença da VRoid (modelos de exemplo do VRoid Studio; conferir os termos antes de vender) |

Modelos de github.com/madjin/vrm-samples (pasta vroid). CC0 = domínio público, pode usar até em jogo pago.

Pra abrir a página no próprio PC: `python3 -m http.server 8000` na pasta do repositório e `http://localhost:8000/`.

## Animações

| Nome no arquivo | Movimento | Origem |
|---|---|---|
| Idle_A | parada, respirando | Mixamo: Breathing Idle |
| Walking_A | andar feminino | Mixamo: Female Walk |
| Running_A | correr | Mixamo: Run Forward |
| Jump_Idle | no ar (vai e volta) | Mixamo: Jump |
| Fall_Idle | caindo | Mixamo: Falling Idle |
| Dodge_Forward | dash (pose de voo; o jogo inclina o corpo) | Mixamo: Front Flip (começo) |
| Jump_Full_Short | cambalhota encolhida (o jogo gira o corpo) | Quaternius UAL: NinjaJump |
| ataques, magias, defesa, dano, morte, sentar, interagir, pegar, machado, picareta | | Quaternius UAL |
| Jump_Start / Jump_Run | impulso do pulo (parado / correndo) | Mixamo: Jumping Up, Jumping While Running |
| Land_A / Land_B | aterrissagem (normal / queda alta) | Mixamo: Landing From Falling Idle, Landing From Jump |
| Flip_Front / Flip_Back | mortal pra frente / pra trás (gira sozinho) | Mixamo: Doing A Forward Flip While Running, Standing Backflip |
| Roll_Quick / Roll_Dive / Roll_Sprint | esquiva: rolamento / mergulho / arrancada rolando | Mixamo: Quick Roll, Dive Roll From Standing, Sprint To Forward Roll |
| Slide_Start / Slide_Loop / Slide_Exit | esquiva: deslizar no chão | Quaternius UAL |
| Climb_Up | subir em obstáculo de ~1 m | Quaternius UAL: ClimbUp_1m |
| Esp1..Esp4 / EspCombo | combo de 4 golpes de espada (Atacar) e o combo inteiro (skill Fúria), com avanço | Mixamo: One Hand Sword Combo |
| Sword_A / Sword_B / Sword_C / Sword_Dash_Full / Sword_Heavy | golpes de espada (combo, salto giratório, investida) | Quaternius UAL |
| Spell_Shoot / Punch_Jab / Punch_Cross / Hit_Knock | magia, socos, levar golpe forte | Quaternius UAL |
| Wall_Up / Wall_Down / Ledge_Up | escalar parede / descer / subir na beirada | Mixamo: Climbing Up Wall, Climbing Down Wall, Braced Hang To Crouch |
| Ladder_Start / Ladder_Loop / Ladder_Top | escada de mão: entrar / subir / sair no topo | Mixamo: Start Climbing Ladder, Climbing Ladder, Climbing To Top |
| Wall_Run / Wall_Climb_Run / Wall_Run_Diag | correr na parede até o topo | Mixamo: Wall Run, Sprint To Wall Climb, Diagonal Wall Run |

As animações de escalada guardam o movimento de verdade (quanto sobem e avançam) em `extras.root` do .glb; a vila move o
personagem por essa curva enquanto a animação toca.

Na vila, o menu ⋯ escolhe o estilo do pulo, do pulo duplo e do dash (os antigos, no jeito do Quimera, continuam como opção).

O jogo é quem move a personagem (as animações ficam no lugar). No Quimera Sandbox, o pulo, a cambalhota e o dash
recebem altura, giro e inclinação feitos no código; num jogo novo dá pra fazer igual ou baixar versões com movimento.

## Refazer ou trocar animações

```
python3 tools/build_vrm.py Sendagaya_Shino.vrm UAL1_Standard.glb UAL2_Standard.glb personagens/sendagaya_shino.glb --mixamo pasta_dos_fbx/
```

- os .vrm: github.com/madjin/vrm-samples (vroid/beta e vroid/stable)
- `UAL1_Standard.glb`, `UAL2_Standard.glb`: github.com/adharshsivan/animationlibrary
- Os .fbx do Mixamo ficam no PC do André (pasta Downloads): corrida, andar, parada, pulo, queda, cambalhota, pulo_impulso,
  pulo_correndo, aterrissa_queda, aterrissa_pulo, mortal_frente, mortal_tras, rolamento, mergulho, arrancada_rola.
  Baixados em mixamo.com com o personagem padrão, FBX Binary, Without Skin, 30 FPS, In Place.
- Os cortes e tempos de cada animação ficam na tabela `MIX` do `build_vrm.py`. Detalhes em `tools/LEIAME.md`.

Veja `LICENCAS.md`.
