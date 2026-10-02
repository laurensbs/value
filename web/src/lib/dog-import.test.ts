import { describe, expect, it } from 'vitest'
import { parseDogCsv } from './dog-import'

describe('parseDogCsv', () => {
  it('reads the template columns and normalises values in four languages', () => {
    const csv = [
      'name,breed,sex,age_years,size,energy,level,walk_minutes,treats,off_leash,ppp,traits,story,photo_url',
      'Mo,Stafford-mix,reu,4,middel,gemiddeld,ervaren,40,ja,nee,nee,Lief;Trekt een beetje,Knuffelkont,https://example.org/mo.jpg',
      'Noor,Galgo,hembra,5,grande,tranquilo,principiante,30,propias,no,no,,,',
    ].join('\n')
    const { dogs, errors } = parseDogCsv(csv)
    expect(errors).toEqual([])
    expect(dogs[0]).toMatchObject({
      name: 'Mo', sex: 'male', ageYears: 4, size: 'medium', energy: 'medium', level: 'experienced',
      walkMinutes: 40, treats: 'yes', offLeash: false, traits: ['Lief', 'Trekt een beetje'], photos: ['https://example.org/mo.jpg'],
    })
    expect(dogs[1]).toMatchObject({ name: 'Noor', sex: 'female', size: 'large', energy: 'calm', level: 'starter', treats: 'own' })
  })

  it('reports rows without a name and ignores unsafe photo links', () => {
    const { dogs, errors } = parseDogCsv('name,photo_url\n,x\nKees,http://insecure.example/k.jpg')
    expect(errors).toEqual([{ row: 2, message: 'missing-name' }])
    expect(dogs[0].photos).toEqual([])
  })
})
