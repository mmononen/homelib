let kaikkiKirjat = [];
let globaaliLeaderboardData = {};
let valittuLeaderboardKategoria = "kirjailija";
let globaaliSarjaData = [];

// ==========================================
// 1. Datan haku JSON-tiedostosta & Alustukset
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  fetch("books.json")
    .then(response => response.json())
    .then(data => {
      kaikkiKirjat = data;
      jarjestaKirjat(kaikkiKirjat);
      paivitaKirjalista(kaikkiKirjat);
      luoTilastot(kaikkiKirjat);
      alustaLeaderboard(kaikkiKirjat);
      alustaSarjat(kaikkiKirjat);
    })
    .catch(error => console.error("Virhe ladattaessa kirjadataa:", error));
});

// ==========================================
// 2. Järjestäminen & Kirjalista (A-Z)
// ==========================================
function jarjestaKirjat(kirjat) {
  kirjat.sort((a, b) => {
    const kirjailijaA = (a.kirjailija || "").split("/")[0].trim();
    const kirjailijaB = (b.kirjailija || "").split("/")[0].trim();

    const kirjailijaVertailu = kirjailijaA.localeCompare(kirjailijaB, 'fi');
    if (kirjailijaVertailu !== 0) return kirjailijaVertailu;

    return (a.nimi || "").localeCompare(b.nimi || "", 'fi');
  });
}

function paivitaKirjalista(kirjat) {
  const listaElementti = document.getElementById("kirjalista");
  if (!listaElementti) return;
  
  listaElementti.innerHTML = "";

  if (kirjat.length === 0) {
    listaElementti.innerHTML = "<p style='text-align:center; color:var(--eos-text-muted);'>Ei hakutuloksia.</p>";
    return;
  }

  kirjat.forEach(kirja => {
    const item = document.createElement("div");
    item.className = "kirja-item";

    const luettuTeksti = kirja.luettu_pvm ? `Luettu ${kirja.luettu_pvm}` : "Lukematon";
    
    const luettuStatus = kirja.luettu_pvm 
      ? '<span class="tila-tagi tila-luettu">Luettu</span>' 
      : '';

    const hyllyStatus = kirja.hyllyssa 
      ? '<span class="tila-tagi tila-hyllyssa">Hyllyssä</span>' 
      : '<span class="tila-tagi tila-ei-hyllyssa">Ei hyllyssä</span>';

    item.innerHTML = `
      <div class="kirja-otsikko-rivi" onclick="toggleHaitari(this)">
        <div class="kirja-paatiedot">
          <span class="kirjailija">${kirja.kirjailija}</span>
          <span class="teos-nimi">${kirja.nimi}</span>
          <span class="vuosi-sivut">(${kirja.julkaisuvuosi}) ${kirja.sivumaara} s.</span>
        </div>
        <div class="kirja-oikea-reuna">
          ${luettuStatus}
          ${hyllyStatus}
          <span class="nuoli">▼</span>
        </div>
      </div>
      
      <div class="kirja-lisatiedot">
        <div class="metat-grid">
          <div><strong>Kustantaja:</strong> ${kirja.kustantaja || "-"}</div>
          <div><strong>Suomentaja:</strong> ${kirja.suomentaja || "-"}</div>
          <div><strong>Alkuperämaa:</strong> ${kirja.alkuperamaa || "-"}</div>
          <div><strong>Lukupäivä:</strong> ${luettuTeksti}</div>
        </div>
      </div>
    `;

    listaElementti.appendChild(item);
  });
}

function toggleHaitari(elementti) {
  const kortti = elementti.parentElement;
  kortti.classList.toggle("open");
}

function suodataKirjat() {
  const hakusana = document.getElementById("hakukentta").value.toLowerCase();

  const suodatetut = kaikkiKirjat.filter(kirja => {
    const yhdistettyStr = `
      ${kirja.kirjailija} ${kirja.nimi} ${kirja.julkaisuvuosi} 
      ${kirja.kustantaja} ${kirja.suomentaja} ${kirja.alkuperamaa}
    `.toLowerCase();

    return yhdistettyStr.includes(hakusana);
  });

  paivitaKirjalista(suodatetut);
}

function naytaNakyma(nakymaId) {
  document.querySelectorAll('.nakyma').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

  const kohdeNakyma = document.getElementById(`nakyma-${nakymaId}`);
  const kohdeBtn = document.getElementById(`btn-${nakymaId}`);

  if (kohdeNakyma) kohdeNakyma.classList.add('active');
  if (kohdeBtn) kohdeBtn.classList.add('active');
}

// ==========================================
// 3. Kirjasarjat -osion käsittely
// ==========================================
function alustaSarjat(kirjat) {
  const sarjatMap = {};

  kirjat.forEach(kirja => {
    if (!kirja.nimi) return;

    const match = kirja.nimi.match(/^\[(.* construct)?([^:]+):\s*(\d+)\]\s*(.*)$/);

    if (match) {
      const sarjanNimi = match[2].trim();
      const osaNumero = parseInt(match[3], 10);
      const teoksenNimi = match[4].trim();

      if (!sarjatMap[sarjanNimi]) {
        sarjatMap[sarjanNimi] = {
          sarja: sarjanNimi,
          tekijatSet: new Set(),
          osat: []
        };
      }

      if (kirja.kirjailija) {
        kirja.kirjailija.split('/').forEach(t => {
          const siistiTekija = t.trim();
          if (siistiTekija.length > 0) {
            sarjatMap[sarjanNimi].tekijatSet.add(siistiTekija);
          }
        });
      }

      sarjatMap[sarjanNimi].osat.push({
        osa: osaNumero,
        nimi: teoksenNimi,
        vuosi: kirja.julkaisuvuosi,
        luettu: kirja.luettu_pvm !== null,
        hyllyssa: kirja.hyllyssa,
        kirjailija: kirja.kirjailija || ""
      });
    }
  });

  globaaliSarjaData = Object.values(sarjatMap).map(s => {
    s.osat.sort((a, b) => a.osa - b.osa);
    s.kirjailija = Array.from(s.tekijatSet).join(" / ") || "Tuntematon tekijä";
    delete s.tekijatSet;
    return s;
  });

  globaaliSarjaData.sort((a, b) => a.sarja.localeCompare(b.sarja, 'fi'));

  renderSarjat(globaaliSarjaData);
}

function renderSarjat(sarjaLista) {
  const container = document.getElementById("sarjat-sisalto");
  if (!container) return;

  if (sarjaLista.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:var(--eos-text-muted);'>Ei sarjoja löytynyt.</p>";
    return;
  }

  let html = "";

  sarjaLista.forEach(s => {
    html += `
      <div class="tilasto-kortti" style="margin-bottom: 1.5rem;">
        <div style="border-bottom: 1px solid var(--eos-purple); padding-bottom: 0.5rem; margin-bottom: 0.8rem;">
          <h3 style="margin: 0; color: var(--eos-cyan); font-size: 1.1rem;">${s.sarja}</h3>
          <span style="font-size: 0.85rem; color: var(--eos-text-muted);">${s.kirjailija}</span>
        </div>

        <ul style="list-style: none; padding: 0; margin: 0;">
    `;

    s.osat.forEach(osa => {
      const luettuTagi = osa.luettu
        ? '<span class="tila-tagi tila-luettu">Luettu</span>'
        : '<span class="tila-tagi" style="background:#333; color:#aaa;">Lukematon</span>';

      const hyllyTagi = osa.hyllyssa
        ? '<span class="tila-tagi tila-hyllyssa">Hyllyssä</span>'
        : '<span class="tila-tagi tila-ei-hyllyssa">Ei hyllyssä</span>';

      html += `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
          <div>
            <strong style="color: var(--eos-purple); font-size: 0.95rem;">Osa ${osa.osa}:</strong> 
            <span>${osa.nimi}</span> 
            <small style="color: var(--eos-text-muted);">(${osa.vuosi || "-"})</small>
          </div>
          <div style="display: flex; gap: 0.4rem; white-space: nowrap;">
            ${luettuTagi}
            ${hyllyTagi}
          </div>
        </li>
      `;
    });

    html += `
        </ul>
      </div>
    `;
  });

  container.innerHTML = html;
}

function suodataSarjat() {
  const hakukentta = document.getElementById("sarja-hakukentta");
  if (!hakukentta) return;
  
  const hakusana = hakukentta.value.toLowerCase();

  const suodatetut = globaaliSarjaData.filter(s => {
    return s.sarja.toLowerCase().includes(hakusana) || 
           s.kirjailija.toLowerCase().includes(hakusana);
  });

  renderSarjat(suodatetut);
}

// ==========================================
// 4. Älykäs Tilastointi & Kirjojen ikälaskenta
// ==========================================

// Apufunktio kirjan iän laskemiseen lukemishetkellä (vuoden tarkkuudella)
function laskeKirjanIka(kirja) {
  if (!kirja.luettu_pvm || !kirja.julkaisuvuosi) return null;
  const luettuVuosi = new Date(kirja.luettu_pvm).getFullYear();
  const julkaisuvuosi = parseInt(kirja.julkaisuvuosi, 10);
  if (isNaN(luettuVuosi) || isNaN(julkaisuvuosi)) return null;
  const ika = luettuVuosi - julkaisuvuosi;
  return ika >= 0 ? ika : 0;
}

// 1. KORTTI: Kirjat iän mukaan luettaessa (Vanhimmasta nuorimpaan) + Keskiarvo ja mediaani
function renderKirjojenIat(kirjalista) {
  const iatData = kirjalista
    .map(k => ({ kirja: k, ika: laskeKirjanIka(k) }))
    .filter(item => item.ika !== null)
    .sort((a, b) => b.ika - a.ika || (a.kirja.nimi || "").localeCompare(b.kirja.nimi || "", 'fi'));

  if (iatData.length === 0) return "<ul><li><em>Ei dataa</em></li></ul>";

  // Keskiarvon ja mediaanin laskenta
  const iatSert = iatData.map(d => d.ika).sort((a, b) => a - b);
  const summa = iatSert.reduce((a, b) => a + b, 0);
  const keskiarvo = (summa / iatSert.length).toFixed(1);

  let mediaani = 0;
  const n = iatSert.length;
  if (n % 2 === 1) {
    mediaani = iatSert[Math.floor(n / 2)];
  } else {
    mediaani = ((iatSert[n / 2 - 1] + iatSert[n / 2]) / 2).toFixed(1);
  }

  let nykyinenSija = 1;
  const listatutSijoilla = iatData.map((item, index) => {
    if (index > 0 && iatData[index - 1].ika !== item.ika) {
      nykyinenSija = index + 1;
    }
    return { sija: nykyinenSija, ...item };
  });

  const top10 = listatutSijoilla.slice(0, 10);
  const loput = listatutSijoilla.slice(10);

  const luoRivitHTML = list => list.map(item => {
    const luettuVuosi = new Date(item.kirja.luettu_pvm).getFullYear();
    return `
      <li style="margin-bottom: 0.5rem;">
        <div>
          <span class="sijanumero">${item.sija}.</span> <strong>${item.kirja.nimi}</strong>
          <div style="font-size: 0.78rem; color: var(--eos-text-muted); margin-left: 1.5rem;">
            ${item.kirja.kirjailija || "Tuntematon kirjailija"} (ilm. ${item.kirja.julkaisuvuosi}, luettu ${luettuVuosi})
          </div>
        </div>
        <div style="text-align: right; white-space: nowrap;">
          <strong>${item.ika} v.</strong>
        </div>
      </li>
    `;
  }).join('');

  let html = `
    <div style="background: rgba(0, 243, 255, 0.05); border-left: 3px solid var(--eos-cyan); padding: 0.6rem; margin-bottom: 0.8rem; font-size: 0.88rem;">
      <div>Keskiarvo: <strong style="color: var(--eos-cyan);">${keskiarvo} v.</strong></div>
      <div>Mediaani: <strong style="color: var(--eos-cyan);">${mediaani} v.</strong></div>
    </div>
    <ul>${luoRivitHTML(top10)}</ul>
  `;

  if (loput.length > 0) {
    html += `
      <div class="piilotetut-rivit" style="display: none;">
        <ul>${luoRivitHTML(loput)}</ul>
      </div>
      <button class="btn-nayta-lisaa" onclick="toggleNaytaKaikki(this)">
        Näytä kaikki (+${loput.length})
      </button>
    `;
  }

  return html;
}

// 2. KORTTI: Kirjojen ikäryhmät luettaessa
function renderIkaRyhmat(kirjalista) {
  const ryhmat = [
    { nimi: "1. Uutuudet (0–1 vuotta)", min: 0, max: 1, kpl: 0, sivut: 0 },
    { nimi: "2. Tuoreet / Ajankohtaiset (1–3 vuotta)", min: 1, max: 3, kpl: 0, sivut: 0 },
    { nimi: "3. Nykykirjallisuus (3–10 vuotta)", min: 3, max: 10, kpl: 0, sivut: 0 },
    { nimi: "4. Vanhempi taustakirjallisuus (10–30 vuotta)", min: 10, max: 30, kpl: 0, sivut: 0 },
    { nimi: "5. Modernit klassikot ja klassikot (30–70 vuotta)", min: 30, max: 70, kpl: 0, sivut: 0 },
    { nimi: "6. Klassikot 70+ vuotta", min: 70, max: Infinity, kpl: 0, sivut: 0 }
  ];

  let yhteensaKpl = 0;

  kirjalista.forEach(k => {
    const ika = laskeKirjanIka(k);
    if (ika === null) return;

    const r = ryhmat.find(item => ika >= item.min && ika < item.max);
    if (r) {
      r.kpl += 1;
      r.sivut += (k.sivumaara || 0);
      yhteensaKpl += 1;
    }
  });

  return `
    <ul>
      ${ryhmat.map(r => {
        const prosentti = yhteensaKpl > 0 
          ? ((r.kpl / yhteensaKpl) * 100).toFixed(1) 
          : "0.0";

        return `
          <li style="margin-bottom: 0.5rem;">
            <div>
              <strong>${r.nimi}</strong>
              <div style="font-size: 0.78rem; color: var(--eos-text-muted);">
                ${r.kpl} kpl (${prosentti} \%) &bull; ${r.sivut} s.
              </div>
            </div>
            <div style="text-align: right; white-space: nowrap;">
              <strong style="color: var(--eos-cyan);">${r.kpl} kpl</strong>
              <div style="font-size: 0.8rem; color: var(--eos-text-muted);">${prosentti} %</div>
            </div>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

// 3. KORTTI: Kirjojen keskimääräinen ikä luettaessa (Alkuperämaa)
function laskeMaittainIat(kirjalista) {
  const maatMap = {};

  kirjalista.forEach(k => {
    const ika = laskeKirjanIka(k);
    if (ika === null || !k.alkuperamaa) return;

    const maat = typeof k.alkuperamaa === 'string'
      ? k.alkuperamaa.split('/').map(s => s.trim()).filter(s => s.length > 0)
      : [k.alkuperamaa];

    maat.forEach(maa => {
      if (!maatMap[maa]) {
        maatMap[maa] = { summa: 0, kpl: 0 };
      }
      maatMap[maa].summa += ika;
      maatMap[maa].kpl += 1;
    });
  });

  return Object.entries(maatMap)
    .map(([maa, stats]) => ({
      maa,
      kpl: stats.kpl,
      keskiarvo: parseFloat((stats.summa / stats.kpl).toFixed(1))
    }))
    .sort((a, b) => b.keskiarvo - a.keskiarvo || a.maa.localeCompare(b.maa, 'fi'));
}

function renderMaanKeskiIat(kirjalista) {
  const maaData = laskeMaittainIat(kirjalista);

  if (maaData.length === 0) return "<ul><li><em>Ei dataa</em></li></ul>";

  let nykyinenSija = 1;
  const listatutSijoilla = maaData.map((item, index) => {
    if (index > 0 && maaData[index - 1].keskiarvo !== item.keskiarvo) {
      nykyinenSija = index + 1;
    }
    return { sija: nykyinenSija, ...item };
  });

  const top10 = listatutSijoilla.slice(0, 10);
  const loput = listatutSijoilla.slice(10);

  const luoRivitHTML = list => list.map(item => `
    <li style="margin-bottom: 0.5rem;">
      <div>
        <span class="sijanumero">${item.sija}.</span> <strong>${item.maa}</strong>
        <div style="font-size: 0.78rem; color: var(--eos-text-muted); margin-left: 1.5rem;">
          ${item.kpl} kpl
        </div>
      </div>
      <div style="text-align: right; white-space: nowrap;">
        <strong>${item.keskiarvo} v.</strong>
      </div>
    </li>
  `).join('');

  let html = `<ul>${luoRivitHTML(top10)}</ul>`;

  if (loput.length > 0) {
    html += `
      <div class="piilotetut-rivit" style="display: none;">
        <ul>${luoRivitHTML(loput)}</ul>
      </div>
      <button class="btn-nayta-lisaa" onclick="toggleNaytaKaikki(this)">
        Näytä kaikki (+${loput.length})
      </button>
    `;
  }

  return html;
}

function luoTilastot(kirjat) {
  const tilastoDiv = document.getElementById("tilastot-sisalto");
  if (!tilastoDiv) return;

  const tilastoKelpoiset = kirjat.filter(k => k.luku_tilastoihin !== false);
  const luetut = tilastoKelpoiset.filter(k => k.luettu_pvm !== null);
  const hyllyssa = kirjat.filter(k => k.hyllyssa);
  const hyllyssaTilastokelpoiset = tilastoKelpoiset.filter(k => k.hyllyssa);
  const hyllyssaLuetut = tilastoKelpoiset.filter(k => k.hyllyssa && k.luettu_pvm !== null);
  const hyllyssaLukematta = tilastoKelpoiset.filter(k => k.hyllyssa && k.luettu_pvm === null);

  const laskeSivut = lista => lista.reduce((sum, k) => sum + (k.sivumaara || 0), 0);

  const luetutVuodet = [...new Set(
    luetut
      .map(k => k.luettu_pvm ? new Date(k.luettu_pvm).getFullYear() : null)
      .filter(v => v !== null && !isNaN(v))
  )].sort((a, b) => b - a);

  const ryhmitteleMetadata = (kirjalista, avain) => {
    return kirjalista.reduce((acc, k) => {
      let arvot = [];

      if (avain === "julkaisuvuosikymmen") {
        const v = parseInt(k.julkaisuvuosi, 10);
        if (!isNaN(v) && v > 0) {
          arvot = [`${Math.floor(v / 10) * 10}-luku`];
        }
      } else {
        const raakaArvo = k[avain];
        if (!raakaArvo && raakaArvo !== 0) return acc;

        arvot = typeof raakaArvo === 'string' 
          ? raakaArvo.split('/').map(s => s.trim()).filter(s => s.length > 0)
          : [raakaArvo];
      }

      arvot.forEach(arvo => {
        if (!acc[arvo]) {
          acc[arvo] = { 
            kpl: 0, 
            sivut: 0,
            hyllyKpl: 0,
            hyllyLuettuKpl: 0
          };
        }
        acc[arvo].kpl += 1;
        acc[arvo].sivut += (k.sivumaara || 0);

        if (k.hyllyssa) {
          acc[arvo].hyllyKpl += 1;
          if (k.luettu_pvm !== null) {
            acc[arvo].hyllyLuettuKpl += 1;
          }
        }
      });

      return acc;
    }, {});
  };

  const renderKirjatPituudessaan = (kirjalista) => {
    const jarjestetyt = [...kirjalista].sort((a, b) => {
      const sivutErotus = (b.sivumaara || 0) - (a.sivumaara || 0);
      if (sivutErotus !== 0) return sivutErotus;
      return (a.nimi || "").localeCompare(b.nimi || "", 'fi');
    });

    if (jarjestetyt.length === 0) return "<ul><li><em>Ei kirjoja</em></li></ul>";

    let nykyinenSija = 1;
    const listatutSijoilla = jarjestetyt.map((kirja, index) => {
      if (index > 0) {
        const edellinenSivumaara = jarjestetyt[index - 1].sivumaara || 0;
        if ((kirja.sivumaara || 0) !== edellinenSivumaara) {
          nykyinenSija = index + 1;
        }
      }
      return { sija: nykyinenSija, kirja };
    });

    const top10 = listatutSijoilla.slice(0, 10);
    const loput = listatutSijoilla.slice(10);

    const luoRivitHTML = list => list.map(item => `
      <li style="margin-bottom: 0.5rem;">
        <div>
          <span class="sijanumero">${item.sija}.</span> <strong>${item.kirja.nimi}</strong>
          <div style="font-size: 0.78rem; color: var(--eos-text-muted); margin-left: 1.5rem;">
            ${item.kirja.kirjailija || "Tuntematon kirjailija"} (${item.kirja.julkaisuvuosi || "-"})
          </div>
        </div>
        <div style="text-align: right; white-space: nowrap;">
          <strong>${item.kirja.sivumaara || 0} s.</strong>
        </div>
      </li>
    `).join('');

    let html = `<ul>${luoRivitHTML(top10)}</ul>`;

    if (loput.length > 0) {
      html += `
        <div class="piilotetut-rivit" style="display: none;">
          <ul>${luoRivitHTML(loput)}</ul>
        </div>
        <button class="btn-nayta-lisaa" onclick="toggleNaytaKaikki(this)">
          Näytä kaikki (+${loput.length})
        </button>
      `;
    }

    return html;
  };

  const renderKokoLista = (ryhmiteltyData, naytaHyllyInfo = true) => {
    const rivit = Object.entries(ryhmiteltyData)
      .sort((a, b) => {
        const maaraErotus = b[1].sivut - a[1].sivut;
        if (maaraErotus !== 0) return maaraErotus;
        return a[0].localeCompare(b[0], 'fi');
      });

    if (rivit.length === 0) return "<ul><li><em>Ei dataa</em></li></ul>";

    let nykyinenSija = 1;
    const rivitSijoilla = rivit.map(([nimi, stats], index) => {
      if (index > 0) {
        const edellinenStats = rivit[index - 1][1];
        if (stats.sivut !== edellinenStats.sivut) {
          nykyinenSija = index + 1;
        }
      }

      const sivuaKeskiarvo = stats.kpl > 0 ? Math.round(stats.sivut / stats.kpl) : 0;
      
      const hyllyLuettuProsenttiKpl = stats.hyllyKpl > 0 
        ? ((stats.hyllyLuettuKpl / stats.hyllyKpl) * 100).toFixed(0) 
        : null;

      return { sija: nykyinenSija, nimi, stats, sivuaKeskiarvo, hyllyLuettuProsenttiKpl };
    });

    const top10 = rivitSijoilla.slice(0, 10);
    const loput = rivitSijoilla.slice(10);

    const luoRivitHTML = list => list.map(item => {
      let hyllyInfo = '';
      if (naytaHyllyInfo) {
        hyllyInfo = item.hyllyLuettuProsenttiKpl !== null 
          ? ` &bull; <em>Hyllyssä: ${item.stats.hyllyLuettuKpl}/${item.stats.hyllyKpl} luettu (${item.hyllyLuettuProsenttiKpl} %)</em>`
          : ` &bull; <em>Ei hyllyssä</em>`;
      }

      return `
        <li style="margin-bottom: 0.5rem;">
          <div>
            <span class="sijanumero">${item.sija}.</span> <strong>${item.nimi}</strong>
            <div style="font-size: 0.78rem; color: var(--eos-text-muted); margin-left: 1.5rem;">
              ${item.stats.kpl} kpl &bull; ka. ${item.sivuaKeskiarvo} s./kirja${hyllyInfo}
            </div>
          </div>
          <div style="text-align: right; white-space: nowrap;">
            <strong>${item.stats.sivut} s.</strong>
          </div>
        </li>
      `;
    }).join('');

    let html = `<ul>${luoRivitHTML(top10)}</ul>`;

    if (loput.length > 0) {
      html += `
        <div class="piilotetut-rivit" style="display: none;">
          <ul>${luoRivitHTML(loput)}</ul>
        </div>
        <button class="btn-nayta-lisaa" onclick="toggleNaytaKaikki(this)">
          Näytä kaikki (+${loput.length})
        </button>
      `;
    }

    return html;
  };

  const luoKategoriaOsa = (otsikko, kohdeKirjat, naytaHyllyInfo = true) => {
    const yhteensaSivut = laskeSivut(kohdeKirjat);
    const yhteensaKpl = kohdeKirjat.length;
    const keskiarvo = yhteensaKpl > 0 ? Math.round(yhteensaSivut / yhteensaKpl) : 0;

    const kirjailijat = ryhmitteleMetadata(kohdeKirjat, "kirjailija");
    const kustantajat = ryhmitteleMetadata(kohdeKirjat, "kustantaja");
    const kaantajat = ryhmitteleMetadata(kohdeKirjat, "suomentaja");
    const maat = ryhmitteleMetadata(kohdeKirjat, "alkuperamaa");
    const vuodet = ryhmitteleMetadata(kohdeKirjat, "julkaisuvuosi");
    const vuosikymmenet = ryhmitteleMetadata(kohdeKirjat, "julkaisuvuosikymmen");

    return `
      <div style="grid-column: 1 / -1; margin-top: 1rem; border-bottom: 2px solid var(--eos-purple);">
        <h2 style="margin-bottom: 0.2rem;">${otsikko}</h2>
        <p style="margin-top: 0; font-size: 0.9rem; color: var(--eos-text-muted);">
          Yhteensä <strong>${yhteensaKpl} kpl</strong> / <strong>${yhteensaSivut} sivua</strong> 
          (Keskimäärin <strong>${keskiarvo} s./kirja</strong>)
        </p>
      </div>

      <div class="tilasto-kortti">
        <h3>Kirjat pituuden mukaan (Sivumäärä)</h3>
        ${renderKirjatPituudessaan(kohdeKirjat)}
      </div>

      <div class="tilasto-kortti">
        <h3>Sivumäärät (Kirjailija)</h3>
        ${renderKokoLista(kirjailijat, naytaHyllyInfo)}
      </div>

      <div class="tilasto-kortti">
        <h3>Sivumäärät (Julkaisuvuosikymmen)</h3>
        ${renderKokoLista(vuosikymmenet, naytaHyllyInfo)}
      </div>

      <div class="tilasto-kortti">
        <h3>Sivumäärät (Alkuperäisjulkaisuvuosi)</h3>
        ${renderKokoLista(vuodet, naytaHyllyInfo)}
      </div>

      <div class="tilasto-kortti">
        <h3>Sivumäärät (Kustantaja)</h3>
        ${renderKokoLista(kustantajat, naytaHyllyInfo)}
      </div>

      <div class="tilasto-kortti">
        <h3>Sivumäärät (Suomentaja)</h3>
        ${renderKokoLista(kaantajat, naytaHyllyInfo)}
      </div>

      <div class="tilasto-kortti">
        <h3>Sivumäärät (Alkuperämaa)</h3>
        ${renderKokoLista(maat, naytaHyllyInfo)}
      </div>

      <div class="tilasto-kortti">
        <h3>Kirjat iän mukaan luettaessa (Vanhimmasta nuorimpaan)</h3>
        ${renderKirjojenIat(kohdeKirjat)}
      </div>

      <div class="tilasto-kortti">
        <h3>Kirjojen keskimääräinen ikä luettaessa (Alkuperämaa)</h3>
        ${renderMaanKeskiIat(kohdeKirjat)}
      </div>

      <div class="tilasto-kortti">
        <h3>Kirjojen ikäryhmät luettaessa</h3>
        ${renderIkaRyhmat(kohdeKirjat)}
      </div>
    `;
  };

  window.paivitaTilastoNakyma = function(valinta) {
    const säiliö = document.getElementById("aktiivinen-tilasto-sisalto");

    if (valinta === "kaikki-luetut") {
      säiliö.innerHTML = luoKategoriaOsa("Kaikki luetut kirjat (Koko historia)", luetut, true);
    } else if (valinta === "hylly-kaikki") {
      säiliö.innerHTML = luoKategoriaOsa("Kaikki hyllyssä olevat kirjat", hyllyssaTilastokelpoiset, false);
    } else if (valinta === "hylly-lukemattomat") {
      säiliö.innerHTML = luoKategoriaOsa("Hyllyn lukemattomat kirjat (Lukujono)", hyllyssaLukematta, false);
    } else if (valinta.startsWith("vuosi-")) {
      const vuosi = valinta.replace("vuosi-", "");
      const vuodenKirjat = luetut.filter(k => {
        if (!k.luettu_pvm) return false;
        return new Date(k.luettu_pvm).getFullYear().toString() === vuosi;
      });
      säiliö.innerHTML = luoKategoriaOsa(`Vuoden ${vuosi} lukutilastot`, vuodenKirjat, false);
    }
  };

  const tilastoValikkoHTML = `
    <div class="tilasto-kortti" style="grid-column: 1 / -1; background: var(--eos-card-bg); border: 1px solid var(--eos-cyan);">
      <h3 style="color: var(--eos-cyan); margin-top: 0;">📊 Valitse näytettävä tilasto-osio</h3>
      <label for="tilastoSelect" style="margin-right: 0.5rem;">Näkymä:</label>
      <select id="tilastoSelect" onchange="paivitaTilastoNakyma(this.value)" style="padding: 0.45rem; background: #000; color: #fff; border: 1px solid var(--eos-cyan); border-radius: 4px; font-size: 0.95rem;">
        <optgroup label="Yleiset tilastot">
          <option value="kaikki-luetut">Kaikki luetut (Koko historia)</option>
        </optgroup>
        <optgroup label="Hyllytilastot">
          <option value="hylly-kaikki">Kaikki hyllyssä olevat kirjat</option>
          <option value="hylly-lukemattomat">Hyllyn lukemattomat kirjat (Lukujono)</option>
        </optgroup>
        <optgroup label="Lukutilastot vuosittain">
          ${luetutVuodet.map(v => `<option value="vuosi-${v}">Vuosi ${v}</option>`).join('')}
        </optgroup>
      </select>
    </div>
  `;

  const hyllyLuettuKplProsentti = hyllyssaTilastokelpoiset.length > 0 
    ? ((hyllyssaLuetut.length / hyllyssaTilastokelpoiset.length) * 100).toFixed(1) 
    : "0.0";
    
  const hyllyLuettuSivutProsentti = laskeSivut(hyllyssaTilastokelpoiset) > 0 
    ? ((laskeSivut(hyllyssaLuetut) / laskeSivut(hyllyssaTilastokelpoiset)) * 100).toFixed(1) 
    : "0.0";

  const rajatutKirjatKpl = kirjat.length - tilastoKelpoiset.length;

  const yleiskatsausHTML = `
    <div class="tilasto-kortti" style="grid-column: 1 / -1;">
      <h3>Yleiskatsaus kokoelmaan</h3>
      <ul>
        <li><span>Tietokannassa kirjoja yhteensä:</span> <strong>${kirjat.length} kpl (${laskeSivut(kirjat)} s.)</strong></li>
        <li><span>Hyllyssä kirjoja yhteensä:</span> <strong>${hyllyssa.length} kpl (${laskeSivut(hyllyssa)} s.)</strong></li>
        <li>
          <span>Hyllyssä olevien kirjojen luettu-aste:</span> 
          <strong style="color: var(--eos-cyan);">${hyllyLuettuKplProsentti} % kirjoista (${hyllyLuettuSivutProsentti} % sivuista)</strong>
        </li>
        <li><span>Luettu yhteensä (lukutilastoissa):</span> <strong>${luetut.length} kpl (${laskeSivut(luetut)} s.)</strong></li>
        <li><span>Hyllyssä lukematta (lukujono):</span> <strong>${hyllyssaLukematta.length} kpl (${laskeSivut(hyllyssaLukematta)} s.)</strong></li>
        ${rajatutKirjatKpl > 0 ? `<li style="color: var(--eos-text-muted); font-size: 0.85rem;"><em>Lukutilastojen ulkopuolelle rajatut teokset (sanakirjat ym.): ${rajatutKirjatKpl} kpl</em></li>` : ''}
      </ul>
    </div>
  `;

  tilastoDiv.innerHTML = `
    ${yleiskatsausHTML}
    ${tilastoValikkoHTML}
    <div id="aktiivinen-tilasto-sisalto" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; grid-column: 1 / -1;"></div>
  `;

  paivitaTilastoNakyma("kaikki-luetut");
}

function toggleNaytaKaikki(btn) {
  const piilotetut = btn.previousElementSibling;
  const onPiilossa = piilotetut.style.display === "none";

  if (onPiilossa) {
    piilotetut.style.display = "block";
    btn.innerText = "Näytä vähemmän (Top 10)";
  } else {
    piilotetut.style.display = "none";
    const kpl = piilotetut.querySelectorAll("li").length;
    btn.innerText = `Näytä kaikki (+${kpl})`;
  }
}

// ==========================================
// 5. Leaderboard Laskenta & Renderöinti
// ==========================================
function alustaLeaderboard(kirjat) {
  const tilastoKelpoiset = kirjat.filter(k => k.luku_tilastoihin !== false);
  const luetut = tilastoKelpoiset.filter(k => k.luettu_pvm !== null);

  const vuodetAsc = [...new Set(
    luetut
      .map(k => k.luettu_pvm ? new Date(k.luettu_pvm).getFullYear() : null)
      .filter(v => v !== null && !isNaN(v))
  )].sort((a, b) => a - b);

  const kategoriat = ["kirjailija", "kustantaja", "suomentaja", "alkuperamaa", "julkaisuvuosi"];

  globaaliLeaderboardData = {
    vuodet: vuodetAsc,
    kategoriat: {}
  };

  kategoriat.forEach(kat => {
    const vuosiSijoitukset = {};

    vuodetAsc.forEach(vuosi => {
      const vuodenKirjat = luetut.filter(k => new Date(k.luettu_pvm).getFullYear() === vuosi);
      
      const ryhmitelty = vuodenKirjat.reduce((acc, k) => {
        const raakaArvo = k[kat];
        if (!raakaArvo && raakaArvo !== 0) return acc;
        const arvot = typeof raakaArvo === 'string' 
          ? raakaArvo.split('/').map(s => s.trim()).filter(s => s.length > 0)
          : [raakaArvo];

        arvot.forEach(a => {
          acc[a] = (acc[a] || 0) + (k.sivumaara || 0);
        });
        return acc;
      }, {});

      const jarjestetyt = Object.entries(ryhmitelty)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fi'));

      const listaPituus = jarjestetyt.length;
      const maxPisteet = Math.min(listaPituus, 10);

      vuosiSijoitukset[vuosi] = jarjestetyt.map(([nimi, sivut], idx) => {
        const lasketutPisteet = Math.max(0, maxPisteet - idx);

        return {
          nimi,
          sivut,
          rank: idx + 1,
          points: lasketutPisteet
        };
      });
    });

    globaaliLeaderboardData.kategoriat[kat] = vuosiSijoitukset;
  });

  alustaLeaderboardValikot();
  paivitaLeaderboardNakyma();
}

function alustaLeaderboardValikot() {
  const container = document.getElementById("leaderboard-sisalto");
  if (!container) return;

  const vuodet = globaaliLeaderboardData.vuodet;
  const nykyhetkiVuosi = vuodet[vuodet.length - 1];

  const valikotHTML = `
    <!-- Pisteiden laskentatavan info-laatikko -->
    <div class="tilasto-kortti" style="grid-column: 1 / -1; background: var(--eos-card-bg); border-left: 4px solid var(--eos-purple); margin-bottom: 1rem; font-size: 0.9rem; line-height: 1.4;">
      <h3 style="margin-top: 0; color: var(--eos-purple); font-size: 1rem;">ℹ️ Miten pisteet lasketaan & Tiebreak-sääntö</h3>
      <p style="margin-bottom: 0.5rem;">
        Jokaisen kalenterivuoden sijoituksista luettujen sivumäärien mukaan jaetaan pisteitä seuraavasti:
      </p>
      <ul style="margin-top: 0; padding-left: 1.2rem; color: var(--eos-text-muted);">
        <li><strong>Täysi lista (10 tai yli):</strong> 1. sija = 10 p &bull; 2. sija = 9 p &bull; ... &bull; 10. sija = 1 p.</li>
        <li><strong>Pieni lista (alle 10 nimikettä):</strong> Maksimipisteet määräytyvät listan koon mukaan. Esim. jos listalla on 4 nimeä, pisteet ovat <strong>4 p, 3 p, 2 p ja 1 p</strong>.</li>
      </ul>
      <p style="margin-top: 0.5rem; margin-bottom: 0.5rem;">
        <strong>⚖️ Tiebreak-sääntö (Tasatilanteen ratkaisu):</strong>
      </p>
      <p style="margin-top: 0; margin-bottom: 0; color: var(--eos-text-muted); font-size: 0.85rem;">
        Jos kahdella tai useammalla kohteella on All-Time -taulukossa sama pistemäärä, paremmuus ratkaistaan järjestyksessä: 
        <strong>1. Kultamitalit (🥇)</strong> &rarr; <strong>2. Hopeamitalit (🥈)</strong> &rarr; <strong>3. Pronssimitalit (🥉)</strong> &rarr; <strong>4. Top 10 -vuodet</strong> &rarr; <strong>5. Aakkosjärjestys</strong>.
      </p>
    </div>

    <!-- Valinnat -->
    <div class="tilasto-kortti" style="grid-column: 1 / -1; background: var(--eos-card-bg); border: 1px solid var(--eos-cyan); margin-bottom: 1rem; display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center;">
      <div>
        <label for="leaderboardKategoriaSelect" style="margin-right: 0.5rem; font-weight: bold;">Kategoria:</label>
        <select id="leaderboardKategoriaSelect" onchange="muutaLeaderboardKategoria(this.value)" style="padding: 0.45rem; background: #000; color: #fff; border: 1px solid var(--eos-cyan); border-radius: 4px; font-size: 0.95rem;">
          <option value="kirjailija">Kirjailijat</option>
          <option value="kustantaja">Kustantajat</option>
          <option value="suomentaja">Suomentajat</option>
          <option value="alkuperamaa">Alkuperämaat</option>
          <option value="julkaisuvuosi">Julkaisuvuodet</option>
        </select>
      </div>

      <div>
        <label for="leaderboardTyyppiSelect" style="margin-right: 0.5rem; font-weight: bold;">Näkymätyyppi:</label>
        <select id="leaderboardTyyppiSelect" onchange="paivitaLeaderboardNakyma()" style="padding: 0.45rem; background: #000; color: #fff; border: 1px solid var(--eos-cyan); border-radius: 4px; font-size: 0.95rem;">
          <option value="kumulatiivinen">Kumulatiivinen (All-Time asti)</option>
          <option value="vuositilasto">Yksittäinen vuositilasto</option>
        </select>
      </div>

      <div>
        <label for="leaderboardVuosiSelect" style="margin-right: 0.5rem; font-weight: bold;">Vuosi:</label>
        <select id="leaderboardVuosiSelect" onchange="paivitaLeaderboardNakyma()" style="padding: 0.45rem; background: #000; color: #fff; border: 1px solid var(--eos-cyan); border-radius: 4px; font-size: 0.95rem;">
          ${[...vuodet].reverse().map(v => `<option value="${v}">${v}${v === nykyhetkiVuosi ? '(Viimeisin / Nykyhetki)' : ''}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="leaderboard-taulukko-container"></div>
  `;

  container.innerHTML = valikotHTML;
}

function muutaLeaderboardKategoria(kat) {
  valittuLeaderboardKategoria = kat;
  paivitaLeaderboardNakyma();
}

function paivitaLeaderboardNakyma() {
  const container = document.getElementById("leaderboard-taulukko-container");
  const vuosiSelect = document.getElementById("leaderboardVuosiSelect");
  const tyyppiSelect = document.getElementById("leaderboardTyyppiSelect");

  if (!container || !vuosiSelect || !tyyppiSelect) return;

  const kohdeVuosi = Number(vuosiSelect.value);
  const nakymaTyyppi = tyyppiSelect.value;
  const vuosiSijoitukset = globaaliLeaderboardData.kategoriat[valittuLeaderboardKategoria];

  if (nakymaTyyppi === "vuositilasto") {
    renderYksittainenVuositilasto(container, kohdeVuosi, vuosiSijoitukset[kohdeVuosi] || []);
  } else {
    renderKumulatiivinenTilasto(container, kohdeVuosi, vuosiSijoitukset);
  }
}

function renderYksittainenVuositilasto(container, vuosi, data) {
  if (data.length === 0) {
    container.innerHTML = `<p style='text-align:center;'>Ei lukudataa vuodelta ${vuosi}.</p>`;
    return;
  }

  let html = `
    <div class="tilasto-kortti" style="overflow-x: auto;">
      <h3 style="margin-bottom: 1rem; color: var(--eos-cyan);">Vuoden ${vuosi} Vuositilasto (Sivumäärän mukaan)</h3>
      <table class="leaderboard-taulukko">
        <thead>
          <tr>
            <th>#</th>
            <th>Nimi</th>
            <th>Luetut sivut</th>
            <th>Leaderboard-pisteet</th>
          </tr>
        </thead>
        <tbody>
  `;

  let nykyinenSija = 1;
  data.forEach((item, index) => {
    if (index > 0 && item.sivut !== data[index - 1].sivut) {
      nykyinenSija = index + 1;
    }

    const pisteetTeksti = item.points > 0 
      ? `<strong style="color: var(--eos-cyan);">${item.points} p</strong>` 
      : `<span style="color: var(--eos-text-muted);">-</span>`;

    html += `
      <tr>
        <td><strong>${nykyinenSija}.</strong></td>
        <td><strong>${item.nimi}</strong></td>
        <td><strong>${item.sivut} s.</strong></td>
        <td>${pisteetTeksti}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function renderKumulatiivinenTilasto(container, kohdeVuosi, vuosiSijoitukset) {
  const vuodet = globaaliLeaderboardData.vuodet.filter(v => v <= kohdeVuosi);

  const vertaileEntiteetteja = (a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    if (b.top10Appearances !== a.top10Appearances) return b.top10Appearances - a.top10Appearances;
    return a.nimi.localeCompare(b.nimi, 'fi');
  };

  const ovatkoTasan = (a, b) => {
    return a.totalPoints === b.totalPoints &&
           a.gold === b.gold &&
           a.silver === b.silver &&
           a.bronze === b.bronze &&
           a.top10Appearances === b.top10Appearances;
  };

  const entiteetit = {};

  vuodet.forEach(vuosi => {
    (vuosiSijoitukset[vuosi] || []).forEach(data => {
      if (data.points === 0) return;

      if (!entiteetit[data.nimi]) {
        entiteetit[data.nimi] = {
          nimi: data.nimi,
          totalPoints: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          top10Appearances: 0,
          bestRank: 999,
          bestYearInfo: "-",
          vuosihistoria: {}
        };
      }

      const e = entiteetit[data.nimi];
      e.totalPoints += data.points;
      e.top10Appearances += 1;
      e.vuosihistoria[vuosi] = data.rank;

      if (data.rank === 1) e.gold += 1;
      if (data.rank === 2) e.silver += 1;
      if (data.rank === 3) e.bronze += 1;

      if (data.rank < e.bestRank) {
        e.bestRank = data.rank;
        e.bestYearInfo = `${vuosi} (${data.rank}.)`;
      }
    });
  });

  const allTimeRankedRaw = Object.values(entiteetit).sort(vertaileEntiteetteja);

  let nykyinenSija = 1;
  const allTimeRanked = allTimeRankedRaw.map((item, index) => {
    if (index > 0) {
      const edellinen = allTimeRankedRaw[index - 1];
      if (!ovatkoTasan(item, edellinen)) {
        nykyinenSija = index + 1;
      }
    }
    return { ...item, displayRank: nykyinenSija };
  });

  const vanhatEntiteetit = {};
  vuodet.filter(v => v < kohdeVuosi).forEach(v => {
    (vuosiSijoitukset[v] || []).forEach(data => {
      if (data.points === 0) return;
      if (!vanhatEntiteetit[data.nimi]) {
        vanhatEntiteetit[data.nimi] = { nimi: data.nimi, totalPoints: 0, gold: 0, silver: 0, bronze: 0, top10Appearances: 0 };
      }
      vanhatEntiteetit[data.nimi].totalPoints += data.points;
      vanhatEntiteetit[data.nimi].top10Appearances += 1;
      if (data.rank === 1) vanhatEntiteetit[data.nimi].gold += 1;
      if (data.rank === 2) vanhatEntiteetit[data.nimi].silver += 1;
      if (data.rank === 3) vanhatEntiteetit[data.nimi].bronze += 1;
    });
  });

  const vanhatRankedRaw = Object.values(vanhatEntiteetit).sort(vertaileEntiteetteja);

  let vanhaSijaCounter = 1;
  const vanhatSijoilla = {};
  vanhatRankedRaw.forEach((item, index) => {
    if (index > 0) {
      const edellinen = vanhatRankedRaw[index - 1];
      if (!ovatkoTasan(item, edellinen)) {
        vanhaSijaCounter = index + 1;
      }
    }
    vanhatSijoilla[item.nimi] = vanhaSijaCounter;
  });

  allTimeRanked.forEach((e) => {
    const nykyinenRank = e.displayRank;
    const esiintynytNykyisena = e.vuosihistoria[kohdeVuosi] !== undefined;

    if (!esiintynytNykyisena) {
      const aiemmatVuodet = Object.keys(e.vuosihistoria).map(Number).filter(v => v < kohdeVuosi);
      if (aiemmatVuodet.length > 0) {
        const viimeisin = Math.max(...aiemmatVuodet);
        e.muutosTeksti = `<span style="color: var(--eos-text-muted)">Viimeksi ${viimeisin}</span>`;
      } else {
        e.muutosTeksti = `-`;
      }
    } else {
      const vanhaRank = vanhatSijoilla[e.nimi];
      if (vanhaRank === undefined) {
        e.muutosTeksti = `<span class="tila-tagi" style="background: var(--eos-purple); color: #fff;">UUSI</span>`;
      } else {
        const erotus = vanhaRank - nykyinenRank;
        if (erotus > 0) {
          e.muutosTeksti = `<span style="color: var(--status-green-text)">▲ +${erotus}</span>`;
        } else if (erotus < 0) {
          e.muutosTeksti = `<span style="color: var(--status-red-text)">▼ ${erotus}</span>`;
        } else {
          e.muutosTeksti = `<span style="color: var(--eos-text-muted)">=</span>`;
        }
      }
    }
  });

  if (allTimeRanked.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>Ei kumulatiivista dataa valitulle vuodelle.</p>";
    return;
  }

  let html = `
    <div class="tilasto-kortti" style="overflow-x: auto;">
      <h3 style="margin-bottom: 1rem; color: var(--eos-cyan);">Kumulatiivinen All-Time -tilanne vuoteen ${kohdeVuosi} asti</h3>
      <table class="leaderboard-taulukko">
        <thead>
          <tr>
            <th>#</th>
            <th>Nimi</th>
            <th>Pisteet</th>
            <th>Muutos</th>
            <th>Mitalit (🥇/🥈/🥉)</th>
            <th>Top 10 -vuodet</th>
            <th>Paras vuosi</th>
          </tr>
        </thead>
        <tbody>
  `;

  allTimeRanked.forEach((item) => {
    html += `
      <tr>
        <td><strong>${item.displayRank}.</strong></td>
        <td><strong>${item.nimi}</strong></td>
        <td><strong style="color: var(--eos-cyan);">${item.totalPoints} p</strong></td>
        <td>${item.muutosTeksti}</td>
        <td>🥇 ${item.gold} | 🥈 ${item.silver} | 🥉 ${item.bronze}</td>
        <td>${item.top10Appearances} v.</td>
        <td>${item.bestYearInfo}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}