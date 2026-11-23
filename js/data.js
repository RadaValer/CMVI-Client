/* Static texts of the home page ("Despre") and the look of the timetable picker.
   Contact details, social links, management team, news, timetable, teachers and
   substitutions live in the database and are edited from /admin. */
window.SITE = {
  home: {
    intro: '<small>Bine ați venit pe site-ul</small> <b>Colegiului „Mihai Viteazul” Ineu</b>',
    patron: {
      title: 'Mihai Viteazul',
      text: 'Domn al Țării Românești între <b>1593 și 1601</b>, Mihai Viteazul a adus în anul <b>1600</b>, pentru prima dată, Țara Românească, Transilvania și Moldova sub o singură conducere. Colegiul nostru îi poartă numele.',
      tags: ['Călugăreni 1595', 'Șelimbăr 1599', 'Unirea 1600']
    },
    missionLeft: 'Misiunea școlii noastre constă în a oferi tinerilor din zona orașului Ineu șansa unei educații <b>echitabile</b> atât în ceea ce privește <b>pregătirea profesională</b>, cât și din perspectiva <b>dezvoltării personale</b>.',
    missionRight: 'Absolvenții noștri trebuie să se poată integra cu succes pe piața europeană a muncii și să fie capabili de a-și continua formarea <b>pe tot parcursul vieții</b>, dând dovadă de <b>toleranță</b>, <b>spirit de echipă</b> și <b>discernământ</b>.',
    eu: {
      title: 'Școală Ambasador a Parlamentului European',
      text: 'Programul Parlamentului European îi apropie pe elevi de <b>democrația parlamentară europeană</b> și de <b>valorile Uniunii</b>. Activitățile sunt coordonate de profesori, ca ambasadori seniori, și duse mai departe de elevi, ca ambasadori juniori.',
      tags: ['Ambasadori seniori', 'Ambasadori juniori', 'Valori europene']
    },
    offer: {
      note: 'Acestea sunt domeniile în care școala noastră oferă cursuri de zi.',
      columns: [
        { title: 'Filiera teoretică', rail: 'linear-gradient(180deg,#4f969c,#32686c)', profiles: [
          { name: 'real', items: ['Matematică-informatică', 'Științele naturii'], grad: 'linear-gradient(100deg,#8070b0,#5f7f9f)' },
          { name: 'uman', items: ['Filologie'], grad: 'linear-gradient(100deg,#4f8d93,#4a72a0)' }] },
        { title: 'Filiera tehnologică', rail: 'linear-gradient(180deg,#8166b0,#4f7f88)', profiles: [
          { name: 'servicii', items: ['Economic', 'Comerț'], grad: 'linear-gradient(100deg,#4f7a9d,#55a09a)' },
          { name: 'tehnic', items: ['Electronică și automatizări', 'Mecanică'], grad: 'linear-gradient(100deg,#5a62ac,#559a7a)' }] },
        { title: 'Învățământ dual', rail: 'linear-gradient(180deg,#2f8f95,#56a070)', profiles: [
          { name: 'tehnic', items: ['Mecanică'], grad: 'linear-gradient(100deg,#557fb0,#458a80)' }] }
      ]
    }
  },

  /* Look of the three school levels in the timetable picker. The classes themselves,
     the timetable, teachers, news and substitutions come from the API (api/index.php). */
  levels: {
    primar: { title: 'Primar', grad: 'linear-gradient(90deg,#7f6fb5,#6a98a8)' },
    gimnaziu: { title: 'Gimnaziu', grad: 'linear-gradient(90deg,#a678b8,#5f76b0)' },
    liceu: { title: 'Liceu', grad: 'linear-gradient(90deg,#5a7fa8,#4f8a80)' },
    altele: { title: 'Altele', grad: 'linear-gradient(90deg,#6f8796,#5d7486)' }
  }
};
