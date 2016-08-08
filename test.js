import fs from 'fs';
import path from 'path';
import del from 'del';
import imageminJpegtran from 'imagemin-jpegtran';
import imageminWebp from 'imagemin-webp';
import isJpg from 'is-jpg';
import mkdirp from 'mkdirp';
import pify from 'pify';
import tempfile from 'tempfile';
import test from 'ava';
import m from './';

const fsP = pify(fs);

test('optimize a file', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixture.jpg'));
	const files = await m(['fixture.jpg'], {plugins: imageminJpegtran()});

	t.is(files[0].path, null);
	t.true(files[0].data.length < buf.length);
	t.true(isJpg(files[0].data));
});

test('optimize a buffer', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixture.jpg'));
	const data = await m.buffer(buf, {plugins: imageminJpegtran()});

	t.true(data.length < buf.length);
	t.true(isJpg(data));
});

test('output error on corrupt images', async t => {
	t.throws(m(['fixture-corrupt.jpg'], {plugins: imageminJpegtran()}), /Corrupt JPEG data/);
});

test('throw on wrong input', async t => {
	t.throws(m('foo'), /Expected an array/);
	t.throws(m.buffer('foo'), /Expected a buffer/);
});

test('return original file if no plugins are defined', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixture.jpg'));
	const files = await m(['fixture.jpg']);

	t.is(files[0].path, null);
	t.deepEqual(files[0].data, buf);
	t.true(isJpg(files[0].data));
});

test('return original buffer if no plugins are defined', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixture.jpg'));
	const data = await m.buffer(buf);

	t.deepEqual(data, buf);
	t.true(isJpg(data));
});

test('output at the specified location', async t => {
	const tmp = tempfile();
	const buf = await fsP.readFile(path.join(__dirname, 'fixture.jpg'));

	await pify(mkdirp)(tmp);
	await fsP.writeFile(path.join(tmp, 'fixture.jpg'), buf);

	const files = await m(['fixture.jpg', `${tmp}/*.jpg`], 'output', {plugins: imageminJpegtran()});

	t.is(path.relative(__dirname, files[0].path), path.join('output', 'fixture.jpg'));
	t.is(path.relative(__dirname, files[1].path), path.join('output', 'fixture.jpg'));

	await del([tmp, 'output'], {force: true});
});

test('output at the specified folder location', async t => {
	let testfolder = 'output2';
	const tmp = tempfile();
	const buf = await fsP.readFile(path.join(__dirname, 'fixture.jpg'));
	await pify(mkdirp)(path.join(tmp, 'bar', 'foo'));

	await fsP.writeFile(path.join(tmp, 'bar', 'fixture.jpg'), buf);
	// await fsP.writeFile(path.join(tmp, 'bar', 'foo', 'fixture.jpg'), buf);
	const files = await m([`${tmp}/**/*.jpg`], testfolder, {plugins: imageminJpegtran()});
	console.log('files', files);
	t.is(path.relative(__dirname, files[0].path), path.join(testfolder, 'bar', 'fixture.jpg'));
	// t.is(path.relative(__dirname, files[1].path), path.join(testfolder, 'bar', 'foo', 'fixture.jpg'));

	await del([tmp, testfolder], {force: true});
});

test('set webp ext', async t => {
	const tmp = tempfile();
	const files = await m(['fixture.jpg'], tmp, {plugins: imageminWebp()});

	t.is(path.extname(files[0].path), '.webp');
	await del(tmp, {force: true});
});
