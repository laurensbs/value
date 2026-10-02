import { describe, expect, it } from 'vitest'
import { nameFromFile, parseDogCsv } from './dog-import'

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

  it('uses the shelter defaults for empty treats and walk length', () => {
    const { dogs } = parseDogCsv('name,treats,walk_minutes\nBram,,\nMo,ja,30', { treats: 'no', walkMinutes: 60 })
    expect(dogs[0]).toMatchObject({ treats: 'no', walkMinutes: 60 })
    expect(dogs[1]).toMatchObject({ treats: 'yes', walkMinutes: 30 })
  })
})

describe('nameFromFile', () => {
  it('turns named photos into names', () => {
    expect(nameFromFile('bram.jpg')).toBe('Bram')
    expect(nameFromFile('lady-di_2.jpeg')).toBe('Lady Di')
    expect(nameFromFile('BOBBY (2).png')).toBe('Bobby')
    expect(nameFromFile('Noor de galgo.webp')).toBe('Noor De Galgo')
    expect(nameFromFile('MacGyver.HEIC')).toBe('MacGyver')
    expect(nameFromFile('Sam 2.jpg')).toBe('Sam')
    expect(nameFromFile('C:\\fotos\\Kees.jpg')).toBe('Kees')
    expect(nameFromFile('Bram2.jpg')).toBe('Bram')
    expect(nameFromFile('hond bram.jpg')).toBe('Bram')
    expect(nameFromFile('R2D2.png')).toBe('R2D2')
  })

  it('ignores names that cameras and apps make up', () => {
    for (const file of [
      'IMG_1234.JPG',
      'IMG-20240101-WA0003.jpg',
      'PXL_20240101_123456789.jpg',
      'DSC01234.JPG',
      'P1010001.JPG',
      '20240101_101010.jpg',
      'WhatsApp Image 2024-01-01 at 10.00.00.jpeg',
      'Schermafbeelding 2024-05-01 om 10.00.00.png',
      'Screenshot_20240101-101010.png',
      'photo_2024-01-01 10.00.00.jpg',
      'e3b0c442-98fc-1c14-9afb-f4c8996fb924.jpg',
      '   .jpg',
      'image.jpg',
      'image0.jpeg',
      'unnamed.jpg',
      'IMG_E1234.JPG',
      'download (3).jpg',
      'untitled.png',
      'naamloos.png',
      'a3f5c9e1b2.jpg',
    ]) {
      expect(nameFromFile(file), file).toBe('')
    }
  })
})
