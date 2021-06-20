import { Bar, Baz, Foo } from 'some/module';

const unused = () => {};

const getFoo = () => 'Foo';
const getFooBar = () => `${getFoo()} Bar`;

function getFooBarBaz () {
    return `${getFooBar} Baz`;
}

export function main() {
    Foo();
    console.log(getFooBarBaz());
}