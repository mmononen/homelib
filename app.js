let kaikkiKirjat = [];

// 1. Datan haku JSON-tiedostosta
document.addEventListener("DOMContentLoaded", () => {
  fetch("books.json")
    .then(response => response.json())
    .then(data => {
      kaikkiKirjat = data;
      jarjestaKirjat(kaikkiKirjat);
      paivitaKirjalista(kaikkiKirjat);
      luoTilastot(kaikkiKirjat);
    })
    .catch(error => console.error("Virhe ladattaessa kirjadataa:", error));
});

// 2. Järjestäminen (Ensimmäisen kirjailijan nimi -> Teoksen nimi)
function jarjestaKirjat(kirjat) {
  kirjat.sort((a, b) => {
    // Otetaan ensimmäinen kirjailija ennen vinoviivaa
    const kirjailijaA = (a.kirjailija || "").split("/")[0].trim();
    const kirjailijaB = (b.kirjailija || "").split("/")[0].trim();

    const kirjailijaVertailu = kirjailijaA.localeCompare(kirjailijaB, 'fi');
    if (kirjailijaVertailu !== 0) return kirjailijaVertailu;

    return (a.nimi || "").localeCompare(b.nimi || "", 'fi');
  });
}

// 3. Tiiviin haitarilistan tulostus
function paivitaKirjalista(kirjat) {
  const listaElementti = document.getElementById("kirjalista");
  listaElementti.innerHTML = "";

  if (kirjat.length === 0) {
    listaElementti.innerHTML = "<p style='text-align:center; color:var(--eos-text-muted);'>Ei hakutuloksia.</p>";
    return;
  }

  kirjat.forEach(kirja => {
    const item = document.createElement("div");
    item.className = "kirja-item";

    const luettuTeksti = kirja.luettu_pvm ? `Luettu ${kirja.luettu_pvm}` : "Lukematon";
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

// Haitarin avaus/sulkeminen
function toggleHaitari(elementti) {
  const kortti = elementti.parentElement;
  kortti.classList.toggle("open");
}

// 4. Hakutoiminto metatiedoista
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

// 5. Näkymän vaihto (Kirjat / Tilastot)
function naytaNakyma(nakymaId) {
  document.querySelectorAll('.nakyma').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

  document.getElementById(`nakyma-${nakymaId}`).classList.add('active');
  document.getElementById(`btn-${nakymaId}`).classList.add('active');
}

// 6. Älykäs Tilastointi (Yksi yhteinen valikko: Vuodet siirretty viimeiseksi)
function luoTilastot(kirjat) {
  const tilastoDiv = document.getElementById("tilastot-sisalto");
  
  // Suodatetaan lukutilastoihin hyväksyttävät kirjat
  const tilastoKelpoiset = kirjat.filter(k => k.luku_tilastoihin !== false);
  const luetut = tilastoKelpoiset.filter(k => k.luettu_pvm !== null);
  const hyllyssa = kirjat.filter(k => k.hyllyssa);
  const hyllyssaTilastokelpoiset = tilastoKelpoiset.filter(k => k.hyllyssa);
  const hyllyssaLuetut = tilastoKelpoiset.filter(k => k.hyllyssa && k.luettu_pvm !== null);
  const hyllyssaLukematta = tilastoKelpoiset.filter(k => k.hyllyssa && k.luettu_pvm === null);

  const laskeSivut = lista => lista.reduce((sum, k) => sum + (k.sivumaara || 0), 0);

  // Etsitään kaikki vuodet, jolloin kirjoja on luettu (laskevassa järjestyksessä)
  const luetutVuodet = [...new Set(
    luetut
      .map(k => k.luettu_pvm ? new Date(k.luettu_pvm).getFullYear() : null)
      .filter(v => v !== null && !isNaN(v))
  )].sort((a, b) => b - a);

  // VINOVIIVA-EROTTELU (Ohittaa null / tyhjät arvot)
  const ryhmitteleMetadata = (kirjalista, avain) => {
    return kirjalista.reduce((acc, k) => {
      const raakaArvo = k[avain];
      if (!raakaArvo && raakaArvo !== 0) return acc;

      const arvot = typeof raakaArvo === 'string' 
        ? raakaArvo.split('/').map(s => s.trim()).filter(s => s.length > 0)
        : [raakaArvo];

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

  // Generoi yksittäisten kirjojen listauksen sivumäärän mukaan järjestettynä
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

  // Generoi tilastorivit (Sijanumero + Aakkostus samalla sijalla)
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
    `;
  };

  // DYNAMIIKKA: Päivittää tilastonäkymän valitun näkymän mukaan
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

  // Valikko-HTML: Vuosikohtaiset suodatukset siirretty alimmaiseksi
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

  // YLEISKATSAUS-KORTTI
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

  // Kootaan näkymä
  tilastoDiv.innerHTML = `
    ${yleiskatsausHTML}
    ${tilastoValikkoHTML}
    <div id="aktiivinen-tilasto-sisalto" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; grid-column: 1 / -1;"></div>
  `;

  // Ladataan oletuksena 'Kaikki luetut' näkyviin
  paivitaTilastoNakyma("kaikki-luetut");
}

// Tilastokortin "Näytä kaikki"-painikkeen toiminto
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