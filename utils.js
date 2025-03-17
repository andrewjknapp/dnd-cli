import fetch from 'node-fetch';

export const baseUrl = 'https://www.dnd5eapi.co';

const getCategoryOptions = async () => {
  return await fetch(baseUrl)
}

export const initialize = async () => {
  let baseCategories
  try {
    baseCategories = await (await fetch(baseUrl + '/api')).json();
  } catch {
    console.log("Not connected to internet")
    return
  }

  return { baseCategories };
}

export const parseCategory = (options, searchTerm) => {
  let result = null;

  for (const option of Object.keys(options)) {
    if (searchTerm.toLowerCase() === option) {
      result = options[option];
    }
  }

  if (!result) result = { failed: true, searchTerm }

  return result;
}

const renderSpell = (data) => {
  console.log(`
    ${data.name} ${data.ritual ? '[R]' : ''}
    Level: ${data.level}
    Casting Time: ${data.casting_time} | Duration: ${data.duration}
    Material: ${data.material} 
    Components: ${data.components.join(', ')}
    Range: ${data.range}

    Desc:
${data.desc}

    Higher Level:
${data.higher_level}
  `)
}

export const renderResult = (category, data) => {
  if (category == '/api/spells') renderSpell(data);
}

export const rollDice = (number, type) => {
  let sum = 0;
  let rolls = [];
  for (let i = 0; i < number; i++) {
    let result = Math.ceil(Math.random() * type)

    rolls.push(result);
    sum += result;
  }

  return {sum, rolls};
}
