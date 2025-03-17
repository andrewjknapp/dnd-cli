import fetch from 'node-fetch';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {baseUrl, initialize, parseCategory, renderResult, rollDice} from './utils.js';
import cheerio from 'cheerio';
import fs from 'fs'

const spellsJSON = JSON.parse(fs.readFileSync('spells.json', 'utf-8'))

let options;

const mainPrompt = async () => {
  return await inquirer.prompt([
    {
      'type': 'text',
      'name': 'prompt',
      'message': '>',
      'prefix': ''
    }
  ])
}

// List of planned commands
// help, quit, list

const helpMessage = () => {

  // Add option for category

  const msg = `
    List of available commands
    help      - lists commands 
    test      - debug utility
    spell     - Type the name of a spell to get its information.
                Do not include punctuation in the name.
    condition - Enter condition name to view information.
    roll      - Enter dice to be rolled in the following format
                Input:  1d12 3d6 2d8[radiant]
                Output: 1d12: 9
                        3d6: 15
                        2d8[radiant]: 4
                        sum: 35
                Enter as many dice rolls as you want space separated.
                The format should be
                "number of dice"d"type of die"[other info ie. damage type]
    monster   - Enter monster's name to get its information
    race      - Enter name of a race to get its information
    quit      - ends process
  `
  console.log(msg);
}

const test = async () => {
  console.log("This is a test");
}

const colorTest = () => {
  let colors = [
	'black', 'red',	'green','yellow','blue','magenta','cyan','white','grey','redBright','greenBright','yellowBright','blueBright','magentaBright','cyanBright','whiteBright','bgBlack','bgRed','bgGreen','bgYellow','bgBlue','bgMagenta','bgCyan','bgWhite','bgGrey','bgRedBright','bgGreenBright','bgYellowBright','bgBlueBright','bgMagentaBright','bgCyanBright','bgWhiteBright'
  ]

  let styles = [
    'bold','dim','italic','underline','overline','inverse','strikethrough'
  ]

  for (const color of colors) console.log(chalk[color]("Color Test:", color))
  //for (const style of styles) console.log(chalk[style]("Style Test:", style));
}

const f = (number, size) => {
  if (!size) size = 4;

  let str = `${number}`;

  if (str.length == 1) str = '  ' + str + ' ';
  else if (str.length == 2) str = ' ' + str + ' ';
  else if (str.length == 3) str = ' ' + str;

  return str;
}

const monster = async () => {
  const { input } = await inquirer.prompt([
    {
      'type': 'text',
      'name': 'input',
      'message': '|',
      'prefix': '[monster]'
    }
  ]);

  const formattedInput = input.split(' ').join('-').toLowerCase();

  let response
  try {
    response = await fetch(baseUrl + '/api/monsters/' + formattedInput);
  } catch {
    console.log("Not connected to internet")
    return
  }
  const data = await response.json();

  if (data.error) {
    console.log(`Unable to find ${input}\n`);
    return
  }

  const n = [
  f(data.strength),
  f(data.dexterity),
  f(data.constitution),
  f(data.intelligence),
  f(data.wisdom),
  f(data.charisma),
  f(data.armor_class),
  f(data.hit_points)
]

  const formatSpeed = (speed) => {
    let display = ''

    for (const entry of Object.entries(speed)) {
      display += `${entry[0]}-${entry[1]} `;
    }

    return display;
  }

  const display = `
    ${chalk.red(data.name)}
     ____                                         ____
    | AC | |===================================| | HP |
    |${n[6]}| | Str | Dex | Con | Int | Wis | Cha | |${n[7]}|
     \\  /  |${n[0]} |${n[1]} |${n[2]} |${n[3]} |${n[4]} |${n[5]} | |    |
      \\/   |===================================| |____|

    ${chalk.red('Size')}: ${data.size}
    ${chalk.red('Type')}: ${data.type}
    ${chalk.red('Speed')}: ${formatSpeed(data.speed)}
    ${chalk.red('Alignment')}: ${data.alignment}
  `

  console.log(display);
}

const roll = async () => {
  const { input } = await inquirer.prompt([
    {
      'type': 'text',
      'name': 'input',
      'prefix': '[roll]',
      'message': '|',
    }
  ])

  let rollIsSwarmCalculation = input.indexOf('>') !== -1
  let diceString = input
  let AC
  let rollModifier = 0

  // The > symbol is only compatible with the d20. 
  // Roll the d20 

  if (rollIsSwarmCalculation) {
    diceString = input.slice(0, input.indexOf('d') + 3)
    AC = input.slice(input.indexOf('>') + 2)

    if (input.indexOf('+') !== -1) {
      rollModifier = Number(input.slice(input.indexOf('+'), input.indexOf('>') - 1))
    }
  }

  const dice = diceString.split(" ").map(die => {
    const dIdx = die.indexOf('d');
    let bracketIdx = die.indexOf('[');
    if (bracketIdx === -1) bracketIdx = diceString.length;

    return {
      input: die,
      number: die.slice(0, dIdx),
      type: die.slice(dIdx + 1, bracketIdx)
    }
  });

  if (rollIsSwarmCalculation) {
    console.log(`Swarm Roll\n\tRolling ${dice[0].number} attacks\n\tTarget AC: ${AC}\n\tRoll Modifier: ${rollModifier}`)

    const { rolls } = rollDice(dice[0].number, 20)

    console.log('\tRaw Rolls: ', chalk.grey(`(${rolls.join(', ')})`));

    const rollsThatAreHits = rolls.map(roll => roll + rollModifier).filter(roll => roll >= AC)

    console.log('  Hits: ', rollsThatAreHits.length, ' | ', chalk.grey(`(${rollsThatAreHits.join(', ')})`))
  } 
  else {
    let total = 0;
    dice.forEach((die) => {
      let { sum, rolls } = rollDice(die.number, die.type)
      console.log(die.input, ':', sum, chalk.grey(`(${rolls.join(', ')})`));
      total += sum;
    })
    console.log(`sum: ${total}\n`)
  }
}

const condition = async () => {
  const { searchCondition } = await inquirer.prompt([
    {
      'type':    'text',
      'message': '|',
      'prefix':  '[condition]',
      'name':    'searchCondition'
    }
  ])

  const formattedCondition = searchCondition.split(' ').join('-').toLowerCase();

  let response;
  try {
    response = await fetch('https://www.dnd5eapi.co/api/conditions/' + formattedCondition);
  } catch {
    console.log("Not connected to internet")
    return
  }
  let body = await response.json();

  console.log('\n' + chalk.red(`${body.name}`) + '\n');

  body.desc.forEach(line => {
    console.log(line);
  })

  console.log();
}

const race = async () => {
  const { searchRace } = await inquirer.prompt([
    {
      'type':    'text',
      'message': '|',
      'prefix':  '[race]',
      'name':    'searchRace'
    }
  ])

  const formattedRace = searchRace.split(' ').join('-').toLowerCase();

  let response

  try {
    response = await fetch('http://dnd5e.wikidot.com/' + formattedRace);
  } catch {
    console.log("Not connected to internet")
    return
  }
  let body = await response.text();

  const $ = cheerio.load(body);

  const title = $('.page-title').text();

  console.log(title)

  const [description, heading, source, ...pageContents] = $('#page-content').text().trim().split('\n').filter(str => str.length > 0);
  
  console.log('\n' + chalk.red(`${title}`) + '\n');
  console.log(description)
  console.log('\n' + chalk.red(`${heading}`));
  console.log(source + '\n');

  pageContents.forEach(element => {
    let row = element.split('.');
    console.log(`${chalk.grey(row[0] + ':')} ${row.slice(1).join('.')}`)
  })

}

const spell = async () => {
  const { searchSpell } = await inquirer.prompt([
    {
      'type':    'text',
      'message': '|',
      'prefix':  '[spell]',
      'name':    'searchSpell'
    }
  ])

  const formattedSpell = searchSpell.split(' ').join('-').toLowerCase();

  let response;
  let connectedToInternet = true
  try {
    response = await fetch('http://dnd5e.wikidot.com/spell:' + formattedSpell);

  } catch {
    connectedToInternet = false
  }

  if (connectedToInternet) {
    let body = await response.text();

    const $ = cheerio.load(body);
  
    const title = $('.page-title').text();
  
    console.log('\n' + chalk.red(`${title}`) + '\n');
    const pageContent = $('#page-content').text().trim().split('\n');
  
    for (let line of pageContent) {
      if (line.includes(':') && line.indexOf(':') < 13) {
        line = line.split(':');
        console.log(chalk.red(line[0]) + ':', line[1]);
      } else {
        if (line.length < 1) continue;
        console.log();
        console.log(line)
      }
    }
  }
  else {

    let selectedSpell = null;
    for (let i = 0; i < spellsJSON.length; i++) {
      if (spellsJSON[i].name.toLowerCase() === searchSpell.toLowerCase()) {
        selectedSpell = spellsJSON[i]
        break
      }
    }

    if (!selectedSpell) {
      console.log('Spell not found')
      return
    }

    console.log('\n' + chalk.red(selectedSpell.name) + '\n');

    console.log(chalk.red('Source') + ': Player\'s Handbook\n')

    console.log(selectedSpell.type)

    console.log(chalk.red('Casting time') + ': ' + selectedSpell.casting_time)
    console.log(chalk.red('Range') + ': ' + selectedSpell.range)
    console.log(chalk.red('Components') + ': ' + selectedSpell.components.raw)
    console.log(chalk.red('Duration') + ': ' + selectedSpell.duration + '\n')
    console.log(selectedSpell.description + '\n')

    console.log(chalk.red('Classes') + ': ' + selectedSpell.classes.join(', '))
  }

  console.log();
}

const search = async () => {

  // Ex search term
  // spells Acid Arrow

  const { searchTerm } = await inquirer.prompt([
    {
      "type": "text",
      "name": "searchTerm",
      "prefix": "[search]",
      "message": "|"
    }
  ]);

  let searchWords = searchTerm.split(' ');
  let searchCategory = searchWords.shift();


  let category = parseCategory(options.baseCategories, searchCategory);

  if (category.failed) {
    console.log(`${category.searchTerm} is not a supported category. Type 'help categories' to see available categories`);
    return
  }

  let searchPhrase = searchWords.join(' ');

  // Call dnd api to see if name given is valid
  try {
    const validationResponse = await fetch(`${baseUrl}${category}?name=${searchPhrase}`);
    const resJson = await validationResponse.json()

    if (resJson.count == 0) throw new Error();
    // else if (resJson.count > 1) {
      // handle more than one response eventually
    // }

    const actualResponse = await fetch(`${baseUrl}${resJson.results[0].url}`);
    const actualData = await actualResponse.json()

    renderResult(category, actualData);

  }
  catch {
    console.log(`${searchPhrase} could not be found under ${searchCategory}`);
  }
}

const defaultMessage = (command) => {
  const msg = `
    ${command} is not a supported command.
    For a list of commands try typing 'help'.
  `
  console.log(msg);
}

const main = async () => {

  options = await initialize();

  while (true) {
    const {prompt} = await mainPrompt();
    if (!prompt) continue;
    if (prompt == 'quit'         || prompt == 'q') break;
    else if (prompt == 'help'    || prompt == 'h') helpMessage();
    else if (prompt == 'test') await test();
    // else if (prompt === 'search') await search();
    else if (prompt == 'spell'   || prompt == 's' ) await spell();
    else if (prompt == 'condition' || prompt == 'c') await condition();
    else if (prompt == 'roll'    || prompt == 'r' ) await roll();
    else if (prompt == 'race'    || prompt == 'ra') await race();
    else if (prompt == 'monster' || prompt == 'm' ) await monster(); 
    else if (prompt == 'color') colorTest();
    else defaultMessage(prompt);

  }

  console.log('Thanks for coming');
}


main();
